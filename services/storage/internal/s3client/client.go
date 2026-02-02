package s3client

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/forensivision/storage/internal/config"
)

type S3Client struct {
	client    *s3.Client
	presigner *s3.PresignClient
	cfg       *config.Config
}

func NewS3Client(c *config.Config) (*S3Client, error) {
	customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL:               c.S3Endpoint,
			HostnameImmutable: true,
			Source:            aws.EndpointSourceCustom,
		}, nil
	})

	awsCfg, err := awsconfig.LoadDefaultConfig(context.Background(),
		awsconfig.WithRegion(c.S3Region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			c.S3AccessKey,
			c.S3SecretKey,
			"",
		)),
		awsconfig.WithEndpointResolverWithOptions(customResolver),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.UsePathStyle = true
	})

	presigner := s3.NewPresignClient(client)

	return &S3Client{
		client:    client,
		presigner: presigner,
		cfg:       c,
	}, nil
}

func (c *S3Client) EnsureBuckets(ctx context.Context) error {
	buckets := []string{c.cfg.S3BucketUpload, c.cfg.S3BucketResult}

	for _, bucket := range buckets {
		_, err := c.client.HeadBucket(ctx, &s3.HeadBucketInput{
			Bucket: aws.String(bucket),
		})
		if err != nil {
			// Bucket doesn't exist, create it
			_, err = c.client.CreateBucket(ctx, &s3.CreateBucketInput{
				Bucket: aws.String(bucket),
			})
			if err != nil {
				return fmt.Errorf("failed to create bucket %s: %w", bucket, err)
			}
		}
	}

	return nil
}

func (c *S3Client) GenerateUploadURL(ctx context.Context, key string, contentType string, expirySecs int) (string, error) {
	request, err := c.presigner.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(c.cfg.S3BucketUpload),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = time.Duration(expirySecs) * time.Second
	})
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	return request.URL, nil
}

func (c *S3Client) GenerateDownloadURL(ctx context.Context, bucket, key string, expirySecs int) (string, error) {
	request, err := c.presigner.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = time.Duration(expirySecs) * time.Second
	})
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned download URL: %w", err)
	}

	return request.URL, nil
}

func (c *S3Client) DeleteObject(ctx context.Context, bucket, key string) error {
	_, err := c.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	})
	return err
}

func (c *S3Client) GetClient() *s3.Client {
	return c.client
}

func (c *S3Client) GetUploadBucket() string {
	return c.cfg.S3BucketUpload
}

func (c *S3Client) GetResultBucket() string {
	return c.cfg.S3BucketResult
}
