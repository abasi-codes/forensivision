package api

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/forensivision/storage/internal/config"
	"github.com/forensivision/storage/internal/service"
	"github.com/gin-gonic/gin"
)

type StorageHandler struct {
	service *service.StorageService
	config  *config.Config
}

func NewStorageHandler(svc *service.StorageService, cfg *config.Config) *StorageHandler {
	return &StorageHandler{
		service: svc,
		config:  cfg,
	}
}

type CreateUploadRequest struct {
	FileName    string `json:"filename" binding:"required"`
	ContentType string `json:"content_type" binding:"required"`
	SizeBytes   int64  `json:"size_bytes" binding:"required,gt=0"`
}

func (h *StorageHandler) CreateUpload(c *gin.Context) {
	var req CreateUploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, errorResponse("VALIDATION_ERROR", "Invalid request body", err.Error()))
		return
	}

	userID := c.MustGet("user_id").(string)

	upload, err := h.service.CreateUpload(c.Request.Context(), userID, req.FileName, req.ContentType, req.SizeBytes)
	if err != nil {
		if strings.Contains(err.Error(), "unsupported content type") {
			c.JSON(http.StatusBadRequest, errorResponse("INVALID_CONTENT_TYPE", err.Error(), ""))
			return
		}
		if strings.Contains(err.Error(), "too large") {
			c.JSON(http.StatusRequestEntityTooLarge, errorResponse("FILE_TOO_LARGE", err.Error(), ""))
			return
		}
		c.JSON(http.StatusInternalServerError, errorResponse("INTERNAL_ERROR", "Failed to create upload", ""))
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": gin.H{
			"upload_id":    upload.ID,
			"upload_url":   upload.UploadURL,
			"key":          upload.Key,
			"expires_at":   upload.ExpiresAt,
			"content_type": upload.ContentType,
		},
	})
}

func (h *StorageHandler) GetUpload(c *gin.Context) {
	uploadID := c.Param("id")
	userID := c.MustGet("user_id").(string)

	upload, err := h.service.GetUpload(c.Request.Context(), uploadID)
	if err != nil {
		c.JSON(http.StatusNotFound, errorResponse("NOT_FOUND", "Upload not found", ""))
		return
	}

	if upload.UserID != userID {
		c.JSON(http.StatusForbidden, errorResponse("FORBIDDEN", "Not authorized to access this upload", ""))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"id":           upload.ID,
			"file_name":    upload.FileName,
			"content_type": upload.ContentType,
			"size_bytes":   upload.SizeBytes,
			"status":       upload.Status,
			"created_at":   upload.CreatedAt,
			"expires_at":   upload.ExpiresAt,
		},
	})
}

func (h *StorageHandler) ConfirmUpload(c *gin.Context) {
	uploadID := c.Param("id")
	userID := c.MustGet("user_id").(string)

	upload, err := h.service.ConfirmUpload(c.Request.Context(), uploadID, userID)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, errorResponse("NOT_FOUND", "Upload not found", ""))
			return
		}
		if strings.Contains(err.Error(), "unauthorized") {
			c.JSON(http.StatusForbidden, errorResponse("FORBIDDEN", "Not authorized", ""))
			return
		}
		c.JSON(http.StatusInternalServerError, errorResponse("INTERNAL_ERROR", "Failed to confirm upload", ""))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"id":     upload.ID,
			"key":    upload.Key,
			"status": upload.Status,
		},
	})
}

func (h *StorageHandler) DeleteUpload(c *gin.Context) {
	uploadID := c.Param("id")
	userID := c.MustGet("user_id").(string)

	if err := h.service.DeleteUpload(c.Request.Context(), uploadID, userID); err != nil {
		if strings.Contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, errorResponse("NOT_FOUND", "Upload not found", ""))
			return
		}
		if strings.Contains(err.Error(), "unauthorized") {
			c.JSON(http.StatusForbidden, errorResponse("FORBIDDEN", "Not authorized", ""))
			return
		}
		c.JSON(http.StatusInternalServerError, errorResponse("INTERNAL_ERROR", "Failed to delete upload", ""))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Upload deleted successfully"})
}

func (h *StorageHandler) GetDownloadURL(c *gin.Context) {
	key := c.Param("key")
	bucket := c.Query("bucket")
	userID := c.MustGet("user_id").(string)

	if bucket == "" {
		bucket = "forensivision-uploads"
	}

	url, err := h.service.GetDownloadURL(c.Request.Context(), bucket, key, userID)
	if err != nil {
		if strings.Contains(err.Error(), "unauthorized") {
			c.JSON(http.StatusForbidden, errorResponse("FORBIDDEN", "Not authorized to access this file", ""))
			return
		}
		c.JSON(http.StatusInternalServerError, errorResponse("INTERNAL_ERROR", "Failed to generate download URL", ""))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"download_url": url,
		},
	})
}

// AuthMiddleware validates authentication via the auth service
func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, errorResponse("MISSING_AUTH", "Authorization header required", ""))
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, errorResponse("INVALID_AUTH", "Invalid authorization format", ""))
			c.Abort()
			return
		}

		token := parts[1]

		// Validate with auth service
		userID, err := validateToken(cfg.AuthServiceURL, token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, errorResponse("INVALID_TOKEN", "Invalid or expired token", ""))
			c.Abort()
			return
		}

		c.Set("user_id", userID)
		c.Next()
	}
}

func validateToken(authServiceURL, token string) (string, error) {
	client := &http.Client{}

	var body io.Reader
	if strings.HasPrefix(token, "fv_") {
		body = strings.NewReader(`{"key":"` + token + `"}`)
	} else {
		body = strings.NewReader(`{"token":"` + token + `"}`)
	}

	endpoint := "/v1/internal/validate"
	if strings.HasPrefix(token, "fv_") {
		endpoint = "/v1/internal/validate-api-key"
	}

	req, err := http.NewRequest("POST", authServiceURL+endpoint, body)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", http.ErrAbortHandler
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if claims, ok := result["claims"].(map[string]interface{}); ok {
		if sub, ok := claims["sub"].(string); ok {
			return sub, nil
		}
	}

	if user, ok := result["user"].(map[string]interface{}); ok {
		if id, ok := user["id"].(string); ok {
			return id, nil
		}
	}

	return "", http.ErrAbortHandler
}

func errorResponse(code, message, details string) gin.H {
	resp := gin.H{
		"error": gin.H{
			"code":    code,
			"message": message,
		},
	}
	if details != "" {
		resp["error"].(gin.H)["details"] = details
	}
	return resp
}
