package config

import (
	"os"
)

type Config struct {
	Environment    string
	Port           string
	RedisURL       string
	AuthServiceURL string

	// S3 Configuration
	S3Endpoint     string
	S3AccessKey    string
	S3SecretKey    string
	S3Region       string
	S3BucketUpload string
	S3BucketResult string

	// File limits
	MaxImageSizeMB int64
	MaxVideoSizeMB int64

	// Presigned URL expiry
	UploadURLExpirySecs   int
	DownloadURLExpirySecs int
}

func Load() *Config {
	return &Config{
		Environment:           getEnv("ENVIRONMENT", "development"),
		Port:                  getEnv("PORT", "8080"),
		RedisURL:              getEnv("REDIS_URL", "localhost:6379"),
		AuthServiceURL:        getEnv("AUTH_SERVICE_URL", "http://localhost:8081"),
		S3Endpoint:            getEnv("S3_ENDPOINT", "http://localhost:9000"),
		S3AccessKey:           getEnv("S3_ACCESS_KEY", "forensivision"),
		S3SecretKey:           getEnv("S3_SECRET_KEY", "forensivision_dev"),
		S3Region:              getEnv("S3_REGION", "us-east-1"),
		S3BucketUpload:        getEnv("S3_BUCKET_UPLOADS", "forensivision-uploads"),
		S3BucketResult:        getEnv("S3_BUCKET_RESULTS", "forensivision-results"),
		MaxImageSizeMB:        50,
		MaxVideoSizeMB:        500,
		UploadURLExpirySecs:   3600,  // 1 hour
		DownloadURLExpirySecs: 86400, // 24 hours
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
