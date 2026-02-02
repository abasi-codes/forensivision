package service

import (
	"context"
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/forensivision/storage/internal/config"
	"github.com/forensivision/storage/internal/s3client"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

var allowedImageTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
	"image/heic": true,
	"image/heif": true,
	"image/tiff": true,
	"image/gif":  true,
}

var allowedVideoTypes = map[string]bool{
	"video/mp4":       true,
	"video/quicktime": true,
	"video/webm":      true,
	"video/x-msvideo": true,
	"video/mpeg":      true,
}

var allowedAudioTypes = map[string]bool{
	"audio/mpeg":      true,
	"audio/wav":       true,
	"audio/x-wav":     true,
	"audio/ogg":       true,
	"audio/webm":      true,
	"audio/mp4":       true,
	"audio/x-m4a":     true,
}

type Upload struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	FileName    string    `json:"file_name"`
	ContentType string    `json:"content_type"`
	SizeBytes   int64     `json:"size_bytes"`
	Key         string    `json:"key"`
	UploadURL   string    `json:"upload_url"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	ExpiresAt   time.Time `json:"expires_at"`
}

type StorageService struct {
	s3     *s3client.S3Client
	redis  *redis.Client
	config *config.Config
}

func NewStorageService(s3 *s3client.S3Client, redis *redis.Client, cfg *config.Config) *StorageService {
	return &StorageService{
		s3:     s3,
		redis:  redis,
		config: cfg,
	}
}

func (s *StorageService) CreateUpload(ctx context.Context, userID, fileName, contentType string, sizeBytes int64) (*Upload, error) {
	// Validate content type
	if !s.isAllowedContentType(contentType) {
		return nil, fmt.Errorf("unsupported content type: %s", contentType)
	}

	// Validate size
	maxSize := s.getMaxSizeForType(contentType)
	if sizeBytes > maxSize {
		return nil, fmt.Errorf("file too large: %d bytes exceeds limit of %d bytes", sizeBytes, maxSize)
	}

	// Generate upload ID and key
	uploadID := uuid.New().String()
	ext := filepath.Ext(fileName)
	key := fmt.Sprintf("uploads/%s/%s%s", userID, uploadID, ext)

	// Generate presigned URL
	uploadURL, err := s.s3.GenerateUploadURL(ctx, key, contentType, s.config.UploadURLExpirySecs)
	if err != nil {
		return nil, fmt.Errorf("failed to generate upload URL: %w", err)
	}

	now := time.Now().UTC()
	upload := &Upload{
		ID:          uploadID,
		UserID:      userID,
		FileName:    sanitizeFileName(fileName),
		ContentType: contentType,
		SizeBytes:   sizeBytes,
		Key:         key,
		UploadURL:   uploadURL,
		Status:      "pending",
		CreatedAt:   now,
		ExpiresAt:   now.Add(time.Duration(s.config.UploadURLExpirySecs) * time.Second),
	}

	// Cache upload info in Redis
	data, _ := json.Marshal(upload)
	s.redis.Set(ctx, fmt.Sprintf("upload:%s", uploadID), data, time.Duration(s.config.UploadURLExpirySecs)*time.Second)

	return upload, nil
}

func (s *StorageService) GetUpload(ctx context.Context, uploadID string) (*Upload, error) {
	data, err := s.redis.Get(ctx, fmt.Sprintf("upload:%s", uploadID)).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, fmt.Errorf("upload not found")
		}
		return nil, err
	}

	var upload Upload
	if err := json.Unmarshal(data, &upload); err != nil {
		return nil, err
	}

	return &upload, nil
}

func (s *StorageService) ConfirmUpload(ctx context.Context, uploadID, userID string) (*Upload, error) {
	upload, err := s.GetUpload(ctx, uploadID)
	if err != nil {
		return nil, err
	}

	if upload.UserID != userID {
		return nil, fmt.Errorf("unauthorized")
	}

	upload.Status = "completed"

	// Update in Redis with longer TTL
	data, _ := json.Marshal(upload)
	s.redis.Set(ctx, fmt.Sprintf("upload:%s", uploadID), data, 24*time.Hour)

	return upload, nil
}

func (s *StorageService) GetDownloadURL(ctx context.Context, bucket, key string, userID string) (string, error) {
	// Validate that the key belongs to the user or is a result
	if !strings.Contains(key, userID) && bucket != s.s3.GetResultBucket() {
		return "", fmt.Errorf("unauthorized")
	}

	return s.s3.GenerateDownloadURL(ctx, bucket, key, s.config.DownloadURLExpirySecs)
}

func (s *StorageService) DeleteUpload(ctx context.Context, uploadID, userID string) error {
	upload, err := s.GetUpload(ctx, uploadID)
	if err != nil {
		return err
	}

	if upload.UserID != userID {
		return fmt.Errorf("unauthorized")
	}

	// Delete from S3
	if err := s.s3.DeleteObject(ctx, s.s3.GetUploadBucket(), upload.Key); err != nil {
		// Log but don't fail - the file might not have been uploaded yet
	}

	// Delete from Redis
	s.redis.Del(ctx, fmt.Sprintf("upload:%s", uploadID))

	return nil
}

func (s *StorageService) isAllowedContentType(contentType string) bool {
	return allowedImageTypes[contentType] || allowedVideoTypes[contentType] || allowedAudioTypes[contentType]
}

func (s *StorageService) getMaxSizeForType(contentType string) int64 {
	if allowedImageTypes[contentType] {
		return s.config.MaxImageSizeMB * 1024 * 1024
	}
	if allowedVideoTypes[contentType] || allowedAudioTypes[contentType] {
		return s.config.MaxVideoSizeMB * 1024 * 1024
	}
	return 10 * 1024 * 1024 // 10MB default
}

func sanitizeFileName(name string) string {
	// Remove path components
	name = filepath.Base(name)

	// Replace problematic characters
	name = strings.ReplaceAll(name, "..", "")

	// Limit length
	if len(name) > 255 {
		ext := filepath.Ext(name)
		name = name[:255-len(ext)] + ext
	}

	return name
}
