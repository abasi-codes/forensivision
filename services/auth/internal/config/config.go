package config

import (
	"os"
	"time"
)

type Config struct {
	Environment           string
	Port                  string
	DatabaseURL           string
	RedisURL              string
	JWTSecret             string
	JWTAccessTokenExpiry  time.Duration
	JWTRefreshTokenExpiry time.Duration
	APIKeyPrefix          string
}

func Load() *Config {
	return &Config{
		Environment:           getEnv("ENVIRONMENT", "development"),
		Port:                  getEnv("PORT", "8080"),
		DatabaseURL:           getEnv("DATABASE_URL", "postgres://forensivision:forensivision_dev@localhost:5432/forensivision?sslmode=disable"),
		RedisURL:              getEnv("REDIS_URL", "localhost:6379"),
		JWTSecret:             getEnv("JWT_SECRET", "dev-jwt-secret-change-in-production"),
		JWTAccessTokenExpiry:  15 * time.Minute,
		JWTRefreshTokenExpiry: 7 * 24 * time.Hour,
		APIKeyPrefix:          "fv",
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
