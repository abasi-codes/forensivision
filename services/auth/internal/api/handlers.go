package api

import (
	"errors"
	"net/http"
	"strings"

	"github.com/forensivision/auth/internal/models"
	"github.com/forensivision/auth/internal/repository"
	"github.com/forensivision/auth/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct {
	authService *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// RegisterRequest represents the registration request body
type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Name     string `json:"name" binding:"required,min=2"`
}

// LoginRequest represents the login request body
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// RefreshRequest represents the refresh token request body
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse("VALIDATION_ERROR", "Invalid request body", err.Error()))
		return
	}

	user, err := h.authService.Register(c.Request.Context(), req.Email, req.Password, req.Name)
	if err != nil {
		if errors.Is(err, repository.ErrUserAlreadyExists) {
			c.JSON(http.StatusConflict, ErrorResponse("USER_EXISTS", "A user with this email already exists", ""))
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse("INTERNAL_ERROR", "Failed to create user", ""))
		return
	}

	c.JSON(http.StatusCreated, SuccessResponse(gin.H{
		"id":    user.ID,
		"type":  "user",
		"attributes": gin.H{
			"email":          user.Email,
			"name":           user.Name,
			"tier":           user.Tier,
			"email_verified": user.EmailVerified,
			"created_at":     user.CreatedAt,
		},
	}))
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse("VALIDATION_ERROR", "Invalid request body", err.Error()))
		return
	}

	token, user, err := h.authService.Login(c.Request.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) {
			c.JSON(http.StatusUnauthorized, ErrorResponse("INVALID_CREDENTIALS", "Invalid email or password", ""))
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse("INTERNAL_ERROR", "Failed to authenticate", ""))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"access_token":  token.AccessToken,
			"refresh_token": token.RefreshToken,
			"token_type":    token.TokenType,
			"expires_in":    token.ExpiresIn,
			"expires_at":    token.ExpiresAt,
			"user": gin.H{
				"id":    user.ID,
				"email": user.Email,
				"name":  user.Name,
				"tier":  user.Tier,
			},
		},
	})
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse("VALIDATION_ERROR", "Invalid request body", err.Error()))
		return
	}

	token, err := h.authService.RefreshToken(c.Request.Context(), req.RefreshToken)
	if err != nil {
		if errors.Is(err, service.ErrInvalidToken) || errors.Is(err, service.ErrTokenExpired) {
			c.JSON(http.StatusUnauthorized, ErrorResponse("INVALID_TOKEN", "Invalid or expired refresh token", ""))
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse("INTERNAL_ERROR", "Failed to refresh token", ""))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"access_token":  token.AccessToken,
			"refresh_token": token.RefreshToken,
			"token_type":    token.TokenType,
			"expires_in":    token.ExpiresIn,
			"expires_at":    token.ExpiresAt,
		},
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse("VALIDATION_ERROR", "Invalid request body", err.Error()))
		return
	}

	_ = h.authService.Logout(c.Request.Context(), req.RefreshToken)

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

// APIKeyHandler handles API key management
type APIKeyHandler struct {
	authService *service.AuthService
}

func NewAPIKeyHandler(authService *service.AuthService) *APIKeyHandler {
	return &APIKeyHandler{authService: authService}
}

type CreateAPIKeyRequest struct {
	Name        string   `json:"name" binding:"required,min=1,max=100"`
	Environment string   `json:"environment" binding:"required,oneof=live test"`
	Scopes      []string `json:"scopes"`
}

func (h *APIKeyHandler) Create(c *gin.Context) {
	var req CreateAPIKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse("VALIDATION_ERROR", "Invalid request body", err.Error()))
		return
	}

	userID := c.MustGet("user_id").(uuid.UUID)

	// Default scopes if not provided
	scopes := req.Scopes
	if len(scopes) == 0 {
		user, _ := h.authService.GetUser(c.Request.Context(), userID)
		if user != nil {
			scopes = models.DefaultScopes(user.Tier)
		}
	}

	apiKey, fullKey, err := h.authService.CreateAPIKey(c.Request.Context(), userID, req.Name, req.Environment, scopes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse("INTERNAL_ERROR", "Failed to create API key", ""))
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"id":          apiKey.ID,
			"type":        "api_key",
			"key":         fullKey, // Only shown once
			"attributes": gin.H{
				"name":        apiKey.Name,
				"key_prefix":  apiKey.KeyPrefix,
				"environment": apiKey.Environment,
				"scopes":      apiKey.Scopes,
				"rate_limit":  apiKey.RateLimit,
				"created_at":  apiKey.CreatedAt,
			},
		},
		"meta": gin.H{
			"warning": "Store this key securely. It will not be shown again.",
		},
	})
}

func (h *APIKeyHandler) List(c *gin.Context) {
	userID := c.MustGet("user_id").(uuid.UUID)

	apiKeys, err := h.authService.ListAPIKeys(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse("INTERNAL_ERROR", "Failed to list API keys", ""))
		return
	}

	items := make([]gin.H, len(apiKeys))
	for i, key := range apiKeys {
		items[i] = gin.H{
			"id":   key.ID,
			"type": "api_key",
			"attributes": gin.H{
				"name":         key.Name,
				"key_prefix":   key.KeyPrefix,
				"environment":  key.Environment,
				"scopes":       key.Scopes,
				"rate_limit":   key.RateLimit,
				"last_used_at": key.LastUsedAt,
				"created_at":   key.CreatedAt,
				"revoked_at":   key.RevokedAt,
			},
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": items})
}

func (h *APIKeyHandler) Revoke(c *gin.Context) {
	keyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse("VALIDATION_ERROR", "Invalid API key ID", ""))
		return
	}

	userID := c.MustGet("user_id").(uuid.UUID)

	if err := h.authService.RevokeAPIKey(c.Request.Context(), userID, keyID); err != nil {
		if errors.Is(err, repository.ErrAPIKeyNotFound) {
			c.JSON(http.StatusNotFound, ErrorResponse("NOT_FOUND", "API key not found", ""))
			return
		}
		if errors.Is(err, service.ErrUnauthorized) {
			c.JSON(http.StatusForbidden, ErrorResponse("FORBIDDEN", "You don't have permission to revoke this key", ""))
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse("INTERNAL_ERROR", "Failed to revoke API key", ""))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "API key revoked successfully"})
}

// UserHandler handles user endpoints
type UserHandler struct {
	authService *service.AuthService
}

func NewUserHandler(authService *service.AuthService) *UserHandler {
	return &UserHandler{authService: authService}
}

func (h *UserHandler) GetCurrentUser(c *gin.Context) {
	userID := c.MustGet("user_id").(uuid.UUID)

	user, err := h.authService.GetUser(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse("INTERNAL_ERROR", "Failed to get user", ""))
		return
	}

	c.JSON(http.StatusOK, SuccessResponse(gin.H{
		"id":   user.ID,
		"type": "user",
		"attributes": gin.H{
			"email":           user.Email,
			"name":            user.Name,
			"tier":            user.Tier,
			"role":            user.Role,
			"email_verified":  user.EmailVerified,
			"mfa_enabled":     user.MFAEnabled,
			"organization_id": user.OrganizationID,
			"created_at":      user.CreatedAt,
			"last_login_at":   user.LastLoginAt,
		},
	}))
}

// InternalHandler handles internal service-to-service communication
type InternalHandler struct {
	authService *service.AuthService
}

func NewInternalHandler(authService *service.AuthService) *InternalHandler {
	return &InternalHandler{authService: authService}
}

type ValidateTokenRequest struct {
	Token string `json:"token" binding:"required"`
}

type ValidateAPIKeyRequest struct {
	Key string `json:"key" binding:"required"`
}

func (h *InternalHandler) ValidateToken(c *gin.Context) {
	var req ValidateTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse("VALIDATION_ERROR", "Invalid request body", err.Error()))
		return
	}

	claims, err := h.authService.ValidateAccessToken(c.Request.Context(), req.Token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, ErrorResponse("INVALID_TOKEN", "Invalid or expired token", ""))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":  true,
		"claims": claims,
	})
}

func (h *InternalHandler) ValidateAPIKey(c *gin.Context) {
	var req ValidateAPIKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse("VALIDATION_ERROR", "Invalid request body", err.Error()))
		return
	}

	apiKey, user, err := h.authService.ValidateAPIKey(c.Request.Context(), req.Key)
	if err != nil {
		c.JSON(http.StatusUnauthorized, ErrorResponse("INVALID_API_KEY", "Invalid API key", ""))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid": true,
		"api_key": gin.H{
			"id":          apiKey.ID,
			"user_id":     apiKey.UserID,
			"environment": apiKey.Environment,
			"scopes":      apiKey.Scopes,
			"rate_limit":  apiKey.RateLimit,
		},
		"user": gin.H{
			"id":              user.ID,
			"email":           user.Email,
			"tier":            user.Tier,
			"organization_id": user.OrganizationID,
		},
	})
}

// Helper functions

func SuccessResponse(data interface{}) gin.H {
	return gin.H{"data": data}
}

func ErrorResponse(code, message, details string) gin.H {
	resp := gin.H{
		"error": gin.H{
			"code":    code,
			"message": message,
			"type":    "error",
		},
	}
	if details != "" {
		resp["error"].(gin.H)["details"] = details
	}
	return resp
}

// AuthMiddleware validates JWT tokens
func AuthMiddleware(authService *service.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, ErrorResponse("MISSING_AUTH", "Authorization header required", ""))
			c.Abort()
			return
		}

		// Check for Bearer token
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, ErrorResponse("INVALID_AUTH", "Invalid authorization format", ""))
			c.Abort()
			return
		}

		token := parts[1]

		// Try JWT first
		claims, err := authService.ValidateAccessToken(c.Request.Context(), token)
		if err == nil {
			userID, _ := uuid.Parse(claims.UserID)
			c.Set("user_id", userID)
			c.Set("claims", claims)
			c.Next()
			return
		}

		// Try API key
		apiKey, user, err := authService.ValidateAPIKey(c.Request.Context(), token)
		if err == nil {
			c.Set("user_id", user.ID)
			c.Set("api_key", apiKey)
			c.Set("user", user)
			c.Next()
			return
		}

		c.JSON(http.StatusUnauthorized, ErrorResponse("INVALID_AUTH", "Invalid token or API key", ""))
		c.Abort()
	}
}
