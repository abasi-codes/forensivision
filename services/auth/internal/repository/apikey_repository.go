package repository

import (
	"context"
	"errors"
	"time"

	"github.com/forensivision/auth/internal/models"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrAPIKeyNotFound = errors.New("API key not found")
	ErrAPIKeyRevoked  = errors.New("API key has been revoked")
	ErrAPIKeyExpired  = errors.New("API key has expired")
)

type APIKeyRepository struct {
	db *pgxpool.Pool
}

func NewAPIKeyRepository(db *pgxpool.Pool) *APIKeyRepository {
	return &APIKeyRepository{db: db}
}

func (r *APIKeyRepository) Create(ctx context.Context, apiKey *models.APIKey) error {
	query := `
		INSERT INTO api_keys (id, user_id, organization_id, name, key_prefix, key_hash, scopes, environment, expires_at, ip_allowlist, rate_limit, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`

	apiKey.ID = uuid.New()
	now := time.Now().UTC()
	apiKey.CreatedAt = now
	apiKey.UpdatedAt = now

	_, err := r.db.Exec(ctx, query,
		apiKey.ID,
		apiKey.UserID,
		apiKey.OrganizationID,
		apiKey.Name,
		apiKey.KeyPrefix,
		apiKey.KeyHash,
		apiKey.Scopes,
		apiKey.Environment,
		apiKey.ExpiresAt,
		apiKey.IPAllowlist,
		apiKey.RateLimit,
		apiKey.CreatedAt,
		apiKey.UpdatedAt,
	)

	return err
}

func (r *APIKeyRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.APIKey, error) {
	query := `
		SELECT id, user_id, organization_id, name, key_prefix, key_hash, scopes, environment,
		       last_used_at, expires_at, ip_allowlist, rate_limit, created_at, updated_at, revoked_at
		FROM api_keys
		WHERE id = $1
	`

	apiKey := &models.APIKey{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&apiKey.ID,
		&apiKey.UserID,
		&apiKey.OrganizationID,
		&apiKey.Name,
		&apiKey.KeyPrefix,
		&apiKey.KeyHash,
		&apiKey.Scopes,
		&apiKey.Environment,
		&apiKey.LastUsedAt,
		&apiKey.ExpiresAt,
		&apiKey.IPAllowlist,
		&apiKey.RateLimit,
		&apiKey.CreatedAt,
		&apiKey.UpdatedAt,
		&apiKey.RevokedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAPIKeyNotFound
		}
		return nil, err
	}

	return apiKey, nil
}

func (r *APIKeyRepository) GetByKeyHash(ctx context.Context, keyHash string) (*models.APIKey, error) {
	query := `
		SELECT id, user_id, organization_id, name, key_prefix, key_hash, scopes, environment,
		       last_used_at, expires_at, ip_allowlist, rate_limit, created_at, updated_at, revoked_at
		FROM api_keys
		WHERE key_hash = $1
	`

	apiKey := &models.APIKey{}
	err := r.db.QueryRow(ctx, query, keyHash).Scan(
		&apiKey.ID,
		&apiKey.UserID,
		&apiKey.OrganizationID,
		&apiKey.Name,
		&apiKey.KeyPrefix,
		&apiKey.KeyHash,
		&apiKey.Scopes,
		&apiKey.Environment,
		&apiKey.LastUsedAt,
		&apiKey.ExpiresAt,
		&apiKey.IPAllowlist,
		&apiKey.RateLimit,
		&apiKey.CreatedAt,
		&apiKey.UpdatedAt,
		&apiKey.RevokedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrAPIKeyNotFound
		}
		return nil, err
	}

	// Check if revoked
	if apiKey.RevokedAt != nil {
		return nil, ErrAPIKeyRevoked
	}

	// Check if expired
	if apiKey.ExpiresAt != nil && apiKey.ExpiresAt.Before(time.Now().UTC()) {
		return nil, ErrAPIKeyExpired
	}

	return apiKey, nil
}

func (r *APIKeyRepository) ListByUserID(ctx context.Context, userID uuid.UUID) ([]*models.APIKey, error) {
	query := `
		SELECT id, user_id, organization_id, name, key_prefix, scopes, environment,
		       last_used_at, expires_at, ip_allowlist, rate_limit, created_at, updated_at, revoked_at
		FROM api_keys
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var apiKeys []*models.APIKey
	for rows.Next() {
		apiKey := &models.APIKey{}
		err := rows.Scan(
			&apiKey.ID,
			&apiKey.UserID,
			&apiKey.OrganizationID,
			&apiKey.Name,
			&apiKey.KeyPrefix,
			&apiKey.Scopes,
			&apiKey.Environment,
			&apiKey.LastUsedAt,
			&apiKey.ExpiresAt,
			&apiKey.IPAllowlist,
			&apiKey.RateLimit,
			&apiKey.CreatedAt,
			&apiKey.UpdatedAt,
			&apiKey.RevokedAt,
		)
		if err != nil {
			return nil, err
		}
		apiKeys = append(apiKeys, apiKey)
	}

	return apiKeys, nil
}

func (r *APIKeyRepository) UpdateLastUsed(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE api_keys SET last_used_at = $2, updated_at = $2 WHERE id = $1`

	now := time.Now().UTC()
	_, err := r.db.Exec(ctx, query, id, now)
	return err
}

func (r *APIKeyRepository) Revoke(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE api_keys SET revoked_at = $2, updated_at = $2 WHERE id = $1 AND revoked_at IS NULL`

	now := time.Now().UTC()
	result, err := r.db.Exec(ctx, query, id, now)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrAPIKeyNotFound
	}

	return nil
}

func (r *APIKeyRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM api_keys WHERE id = $1`

	result, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrAPIKeyNotFound
	}

	return nil
}
