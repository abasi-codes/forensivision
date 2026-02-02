package api

import (
	"github.com/forensivision/auth/internal/config"
	"github.com/forensivision/auth/internal/service"
	"github.com/gin-gonic/gin"
)

func SetupRoutes(router *gin.Engine, authService *service.AuthService, cfg *config.Config) {
	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy", "service": "auth"})
	})

	// API v1 routes
	v1 := router.Group("/v1")
	{
		// Auth endpoints
		auth := v1.Group("/auth")
		{
			handler := NewAuthHandler(authService)
			auth.POST("/register", handler.Register)
			auth.POST("/login", handler.Login)
			auth.POST("/refresh", handler.RefreshToken)
			auth.POST("/logout", handler.Logout)
		}

		// API Key management
		apiKeys := v1.Group("/api-keys")
		apiKeys.Use(AuthMiddleware(authService))
		{
			handler := NewAPIKeyHandler(authService)
			apiKeys.POST("", handler.Create)
			apiKeys.GET("", handler.List)
			apiKeys.DELETE("/:id", handler.Revoke)
		}

		// User endpoints
		users := v1.Group("/users")
		users.Use(AuthMiddleware(authService))
		{
			handler := NewUserHandler(authService)
			users.GET("/me", handler.GetCurrentUser)
		}

		// Internal validation endpoint (for other services)
		internal := v1.Group("/internal")
		{
			handler := NewInternalHandler(authService)
			internal.POST("/validate", handler.ValidateToken)
			internal.POST("/validate-api-key", handler.ValidateAPIKey)
		}
	}
}
