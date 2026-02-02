package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents a user account
type User struct {
	ID             uuid.UUID  `json:"id"`
	Email          string     `json:"email"`
	PasswordHash   string     `json:"-"`
	Name           string     `json:"name"`
	OrganizationID *uuid.UUID `json:"organization_id,omitempty"`
	Role           string     `json:"role"`
	Tier           string     `json:"tier"`
	EmailVerified  bool       `json:"email_verified"`
	MFAEnabled     bool       `json:"mfa_enabled"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	LastLoginAt    *time.Time `json:"last_login_at,omitempty"`
}

// Organization represents a team/company
type Organization struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Tier      string    `json:"tier"`
	OwnerID   uuid.UUID `json:"owner_id"`
	Settings  JSONB     `json:"settings,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// APIKey represents an API key for authentication
type APIKey struct {
	ID             uuid.UUID  `json:"id"`
	UserID         uuid.UUID  `json:"user_id"`
	OrganizationID *uuid.UUID `json:"organization_id,omitempty"`
	Name           string     `json:"name"`
	KeyPrefix      string     `json:"key_prefix"`
	KeyHash        string     `json:"-"`
	Scopes         []string   `json:"scopes"`
	Environment    string     `json:"environment"` // "live" or "test"
	LastUsedAt     *time.Time `json:"last_used_at,omitempty"`
	ExpiresAt      *time.Time `json:"expires_at,omitempty"`
	IPAllowlist    []string   `json:"ip_allowlist,omitempty"`
	RateLimit      int        `json:"rate_limit"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	RevokedAt      *time.Time `json:"revoked_at,omitempty"`
}

// Token represents JWT access and refresh tokens
type Token struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	TokenType    string    `json:"token_type"`
	ExpiresIn    int       `json:"expires_in"`
	ExpiresAt    time.Time `json:"expires_at"`
}

// Claims represents JWT token claims
type Claims struct {
	UserID         string   `json:"sub"`
	Email          string   `json:"email"`
	Name           string   `json:"name"`
	OrganizationID string   `json:"org_id,omitempty"`
	Role           string   `json:"role"`
	Tier           string   `json:"tier"`
	Scopes         []string `json:"scope"`
}

// JSONB represents a JSONB database column
type JSONB map[string]interface{}

// Tier constants
const (
	TierFree         = "free"
	TierCreator      = "creator"
	TierProfessional = "professional"
	TierBusiness     = "business"
	TierEnterprise   = "enterprise"
)

// Role constants
const (
	RoleOwner   = "owner"
	RoleAdmin   = "admin"
	RoleAnalyst = "analyst"
	RoleViewer  = "viewer"
	RoleAPIOnly = "api_only"
)

// Scope constants
const (
	ScopeAnalyzeRead    = "analyze:read"
	ScopeAnalyzeWrite   = "analyze:write"
	ScopeResultsRead    = "results:read"
	ScopeResultsExport  = "results:export"
	ScopeWebhooksManage = "webhooks:manage"
	ScopeUsageRead      = "usage:read"
	ScopeBillingRead    = "billing:read"
	ScopeBillingWrite   = "billing:write"
	ScopeAdminAll       = "admin:*"
)

// DefaultScopes returns default scopes for a tier
func DefaultScopes(tier string) []string {
	baseScopes := []string{ScopeAnalyzeRead, ScopeAnalyzeWrite, ScopeResultsRead, ScopeUsageRead}

	switch tier {
	case TierFree:
		return []string{ScopeAnalyzeRead, ScopeAnalyzeWrite, ScopeResultsRead}
	case TierCreator:
		return baseScopes
	case TierProfessional:
		return append(baseScopes, ScopeResultsExport, ScopeWebhooksManage)
	case TierBusiness, TierEnterprise:
		return append(baseScopes, ScopeResultsExport, ScopeWebhooksManage, ScopeBillingRead, ScopeBillingWrite)
	default:
		return baseScopes
	}
}
