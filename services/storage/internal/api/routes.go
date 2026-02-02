package api

import (
	"github.com/forensivision/storage/internal/config"
	"github.com/forensivision/storage/internal/service"
	"github.com/gin-gonic/gin"
)

func SetupRoutes(router *gin.Engine, storageService *service.StorageService, cfg *config.Config) {
	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy", "service": "storage"})
	})

	// API v1 routes
	v1 := router.Group("/v1")
	{
		handler := NewStorageHandler(storageService, cfg)

		// Upload endpoints
		uploads := v1.Group("/uploads")
		uploads.Use(AuthMiddleware(cfg))
		{
			uploads.POST("", handler.CreateUpload)
			uploads.GET("/:id", handler.GetUpload)
			uploads.POST("/:id/confirm", handler.ConfirmUpload)
			uploads.DELETE("/:id", handler.DeleteUpload)
		}

		// Download endpoint
		downloads := v1.Group("/downloads")
		downloads.Use(AuthMiddleware(cfg))
		{
			downloads.GET("/:key", handler.GetDownloadURL)
		}
	}
}
