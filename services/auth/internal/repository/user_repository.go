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
	ErrUserNotFound      = errors.New("user not found")
	ErrUserAlreadyExists = errors.New("user already exists")
)

type UserRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(ctx context.Context, user *models.User) error {
	query := `
		INSERT INTO users (id, email, password_hash, name, organization_id, role, tier, email_verified, mfa_enabled, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id
	`

	user.ID = uuid.New()
	now := time.Now().UTC()
	user.CreatedAt = now
	user.UpdatedAt = now

	_, err := r.db.Exec(ctx, query,
		user.ID,
		user.Email,
		user.PasswordHash,
		user.Name,
		user.OrganizationID,
		user.Role,
		user.Tier,
		user.EmailVerified,
		user.MFAEnabled,
		user.CreatedAt,
		user.UpdatedAt,
	)

	if err != nil {
		// Check for unique violation
		if isDuplicateKeyError(err) {
			return ErrUserAlreadyExists
		}
		return err
	}

	return nil
}

func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	query := `
		SELECT id, email, password_hash, name, organization_id, role, tier, email_verified, mfa_enabled, created_at, updated_at, last_login_at
		FROM users
		WHERE id = $1
	`

	user := &models.User{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Name,
		&user.OrganizationID,
		&user.Role,
		&user.Tier,
		&user.EmailVerified,
		&user.MFAEnabled,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return user, nil
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `
		SELECT id, email, password_hash, name, organization_id, role, tier, email_verified, mfa_enabled, created_at, updated_at, last_login_at
		FROM users
		WHERE email = $1
	`

	user := &models.User{}
	err := r.db.QueryRow(ctx, query, email).Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.Name,
		&user.OrganizationID,
		&user.Role,
		&user.Tier,
		&user.EmailVerified,
		&user.MFAEnabled,
		&user.CreatedAt,
		&user.UpdatedAt,
		&user.LastLoginAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return user, nil
}

func (r *UserRepository) Update(ctx context.Context, user *models.User) error {
	query := `
		UPDATE users
		SET email = $2, name = $3, organization_id = $4, role = $5, tier = $6,
		    email_verified = $7, mfa_enabled = $8, updated_at = $9, last_login_at = $10
		WHERE id = $1
	`

	user.UpdatedAt = time.Now().UTC()

	result, err := r.db.Exec(ctx, query,
		user.ID,
		user.Email,
		user.Name,
		user.OrganizationID,
		user.Role,
		user.Tier,
		user.EmailVerified,
		user.MFAEnabled,
		user.UpdatedAt,
		user.LastLoginAt,
	)

	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrUserNotFound
	}

	return nil
}

func (r *UserRepository) UpdateLastLogin(ctx context.Context, userID uuid.UUID) error {
	query := `
		UPDATE users SET last_login_at = $2, updated_at = $2 WHERE id = $1
	`

	now := time.Now().UTC()
	_, err := r.db.Exec(ctx, query, userID, now)
	return err
}

func (r *UserRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM users WHERE id = $1`

	result, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return err
	}

	if result.RowsAffected() == 0 {
		return ErrUserNotFound
	}

	return nil
}

func isDuplicateKeyError(err error) bool {
	// PostgreSQL error code for unique violation is 23505
	return err != nil && (err.Error() == "ERROR: duplicate key value violates unique constraint" ||
		contains(err.Error(), "23505") ||
		contains(err.Error(), "duplicate key"))
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > 0 && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
