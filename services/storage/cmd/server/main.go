package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/forensivision/storage/internal/api"
	"github.com/forensivision/storage/internal/config"
	"github.com/forensivision/storage/internal/s3client"
	"github.com/forensivision/storage/internal/service"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

func main() {
	cfg := config.Load()

	// Initialize S3 client
	s3Client, err := s3client.NewS3Client(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize S3 client: %v", err)
	}

	// Ensure buckets exist
	ctx := context.Background()
	if err := s3Client.EnsureBuckets(ctx); err != nil {
		log.Fatalf("Failed to ensure buckets exist: %v", err)
	}

	// Initialize Redis
	redisClient := redis.NewClient(&redis.Options{
		Addr: cfg.RedisURL,
	})
	defer redisClient.Close()

	if err := redisClient.Ping(ctx).Err(); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}

	// Initialize service
	storageService := service.NewStorageService(s3Client, redisClient, cfg)

	// Initialize router
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// Setup routes
	api.SetupRoutes(router, storageService, cfg)

	// Create server
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server
	go func() {
		log.Printf("Storage service starting on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited properly")
}
