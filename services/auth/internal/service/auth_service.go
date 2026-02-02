package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/forensivision/auth/internal/config"
	"github.com/forensivision/auth/internal/models"
	"github.com/forensivision/auth/internal/repository"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrInvalidToken       = errors.New("invalid token")
	ErrTokenExpired       = errors.New("token expired")
	ErrInvalidAPIKey      = errors.New("invalid API key")
	ErrUnauthorized       = errors.New("unauthorized")
)

type AuthService struct {
	userRepo   *repository.UserRepository
	apiKeyRepo *repository.APIKeyRepository
	redis      *redis.Client
	config     *config.Config
}

func NewAuthService(
	userRepo *repository.UserRepository,
	apiKeyRepo *repository.APIKeyRepository,
	redis *redis.Client,
	config *config.Config,
) *AuthService {
	return &AuthService{
		userRepo:   userRepo,
		apiKeyRepo: apiKeyRepo,
		redis:      redis,
		config:     config,
	}
}

// Register creates a new user account
func (s *AuthService) Register(ctx context.Context, email, password, name string) (*models.User, error) {
	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	user := &models.User{
		Email:        strings.ToLower(strings.TrimSpace(email)),
		PasswordHash: string(hashedPassword),
		Name:         strings.TrimSpace(name),
		Role:         models.RoleOwner,
		Tier:         models.TierFree,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

// Login authenticates a user and returns tokens
func (s *AuthService) Login(ctx context.Context, email, password string) (*models.Token, *models.User, error) {
	user, err := s.userRepo.GetByEmail(ctx, strings.ToLower(strings.TrimSpace(email)))
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, nil, ErrInvalidCredentials
		}
		return nil, nil, err
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, nil, ErrInvalidCredentials
	}

	// Update last login
	_ = s.userRepo.UpdateLastLogin(ctx, user.ID)

	// Generate tokens
	token, err := s.generateTokens(ctx, user)
	if err != nil {
		return nil, nil, err
	}

	return token, user, nil
}

// RefreshToken generates new tokens from a refresh token
func (s *AuthService) RefreshToken(ctx context.Context, refreshToken string) (*models.Token, error) {
	// Validate refresh token
	claims, err := s.validateToken(refreshToken, true)
	if err != nil {
		return nil, err
	}

	// Check if refresh token is blacklisted
	blacklisted, err := s.redis.Exists(ctx, "blacklist:"+refreshToken).Result()
	if err != nil {
		return nil, err
	}
	if blacklisted > 0 {
		return nil, ErrInvalidToken
	}

	// Get user
	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		return nil, ErrInvalidToken
	}

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Blacklist old refresh token
	s.redis.Set(ctx, "blacklist:"+refreshToken, "1", s.config.JWTRefreshTokenExpiry)

	// Generate new tokens
	return s.generateTokens(ctx, user)
}

// Logout invalidates the refresh token
func (s *AuthService) Logout(ctx context.Context, refreshToken string) error {
	s.redis.Set(ctx, "blacklist:"+refreshToken, "1", s.config.JWTRefreshTokenExpiry)
	return nil
}

// ValidateAccessToken validates an access token and returns claims
func (s *AuthService) ValidateAccessToken(ctx context.Context, tokenString string) (*models.Claims, error) {
	return s.validateToken(tokenString, false)
}

// CreateAPIKey creates a new API key for a user
func (s *AuthService) CreateAPIKey(ctx context.Context, userID uuid.UUID, name string, environment string, scopes []string) (*models.APIKey, string, error) {
	// Generate random key
	keyBytes := make([]byte, 32)
	if _, err := rand.Read(keyBytes); err != nil {
		return nil, "", fmt.Errorf("failed to generate API key: %w", err)
	}

	// Format: fv_{environment}_{type}_{random}
	rawKey := base64.RawURLEncoding.EncodeToString(keyBytes)
	fullKey := fmt.Sprintf("%s_%s_sk_%s", s.config.APIKeyPrefix, environment, rawKey)
	keyPrefix := fullKey[:20] + "..."

	// Hash the key for storage
	hash := sha256.Sum256([]byte(fullKey))
	keyHash := hex.EncodeToString(hash[:])

	// Get user to determine rate limit
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, "", err
	}

	rateLimit := getRateLimitForTier(user.Tier)

	apiKey := &models.APIKey{
		UserID:         userID,
		OrganizationID: user.OrganizationID,
		Name:           name,
		KeyPrefix:      keyPrefix,
		KeyHash:        keyHash,
		Scopes:         scopes,
		Environment:    environment,
		RateLimit:      rateLimit,
	}

	if err := s.apiKeyRepo.Create(ctx, apiKey); err != nil {
		return nil, "", err
	}

	return apiKey, fullKey, nil
}

// ValidateAPIKey validates an API key and returns the associated key info
func (s *AuthService) ValidateAPIKey(ctx context.Context, key string) (*models.APIKey, *models.User, error) {
	// Hash the provided key
	hash := sha256.Sum256([]byte(key))
	keyHash := hex.EncodeToString(hash[:])

	// Look up by hash
	apiKey, err := s.apiKeyRepo.GetByKeyHash(ctx, keyHash)
	if err != nil {
		if errors.Is(err, repository.ErrAPIKeyNotFound) ||
			errors.Is(err, repository.ErrAPIKeyRevoked) ||
			errors.Is(err, repository.ErrAPIKeyExpired) {
			return nil, nil, ErrInvalidAPIKey
		}
		return nil, nil, err
	}

	// Update last used (async, ignore errors)
	go func() {
		_ = s.apiKeyRepo.UpdateLastUsed(context.Background(), apiKey.ID)
	}()

	// Get user
	user, err := s.userRepo.GetByID(ctx, apiKey.UserID)
	if err != nil {
		return nil, nil, err
	}

	return apiKey, user, nil
}

// RevokeAPIKey revokes an API key
func (s *AuthService) RevokeAPIKey(ctx context.Context, userID, keyID uuid.UUID) error {
	// Verify ownership
	apiKey, err := s.apiKeyRepo.GetByID(ctx, keyID)
	if err != nil {
		return err
	}

	if apiKey.UserID != userID {
		return ErrUnauthorized
	}

	return s.apiKeyRepo.Revoke(ctx, keyID)
}

// ListAPIKeys lists all API keys for a user
func (s *AuthService) ListAPIKeys(ctx context.Context, userID uuid.UUID) ([]*models.APIKey, error) {
	return s.apiKeyRepo.ListByUserID(ctx, userID)
}

// GetUser returns a user by ID
func (s *AuthService) GetUser(ctx context.Context, id uuid.UUID) (*models.User, error) {
	return s.userRepo.GetByID(ctx, id)
}

// generateTokens creates access and refresh tokens
func (s *AuthService) generateTokens(ctx context.Context, user *models.User) (*models.Token, error) {
	now := time.Now().UTC()
	accessExpiry := now.Add(s.config.JWTAccessTokenExpiry)
	refreshExpiry := now.Add(s.config.JWTRefreshTokenExpiry)

	scopes := models.DefaultScopes(user.Tier)

	// Access token
	accessClaims := jwt.MapClaims{
		"sub":    user.ID.String(),
		"email":  user.Email,
		"name":   user.Name,
		"role":   user.Role,
		"tier":   user.Tier,
		"scope":  strings.Join(scopes, " "),
		"iat":    now.Unix(),
		"exp":    accessExpiry.Unix(),
		"iss":    "forensivision",
		"aud":    "forensivision-api",
		"type":   "access",
	}

	if user.OrganizationID != nil {
		accessClaims["org_id"] = user.OrganizationID.String()
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString([]byte(s.config.JWTSecret))
	if err != nil {
		return nil, fmt.Errorf("failed to sign access token: %w", err)
	}

	// Refresh token
	refreshClaims := jwt.MapClaims{
		"sub":  user.ID.String(),
		"iat":  now.Unix(),
		"exp":  refreshExpiry.Unix(),
		"iss":  "forensivision",
		"type": "refresh",
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString([]byte(s.config.JWTSecret))
	if err != nil {
		return nil, fmt.Errorf("failed to sign refresh token: %w", err)
	}

	return &models.Token{
		AccessToken:  accessTokenString,
		RefreshToken: refreshTokenString,
		TokenType:    "Bearer",
		ExpiresIn:    int(s.config.JWTAccessTokenExpiry.Seconds()),
		ExpiresAt:    accessExpiry,
	}, nil
}

// validateToken validates a JWT token
func (s *AuthService) validateToken(tokenString string, isRefresh bool) (*models.Claims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.config.JWTSecret), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrTokenExpired
		}
		return nil, ErrInvalidToken
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidToken
	}

	// Check token type
	tokenType, _ := claims["type"].(string)
	if isRefresh && tokenType != "refresh" {
		return nil, ErrInvalidToken
	}
	if !isRefresh && tokenType != "access" {
		return nil, ErrInvalidToken
	}

	modelClaims := &models.Claims{
		UserID: claims["sub"].(string),
	}

	if email, ok := claims["email"].(string); ok {
		modelClaims.Email = email
	}
	if name, ok := claims["name"].(string); ok {
		modelClaims.Name = name
	}
	if orgID, ok := claims["org_id"].(string); ok {
		modelClaims.OrganizationID = orgID
	}
	if role, ok := claims["role"].(string); ok {
		modelClaims.Role = role
	}
	if tier, ok := claims["tier"].(string); ok {
		modelClaims.Tier = tier
	}
	if scope, ok := claims["scope"].(string); ok {
		modelClaims.Scopes = strings.Split(scope, " ")
	}

	return modelClaims, nil
}

func getRateLimitForTier(tier string) int {
	switch tier {
	case models.TierFree:
		return 20
	case models.TierCreator:
		return 60
	case models.TierProfessional:
		return 300
	case models.TierBusiness:
		return 1000
	case models.TierEnterprise:
		return 5000
	default:
		return 20
	}
}
