-- ForensiVision Initial Database Schema
-- Migration: 001_initial_schema
-- Created: 2026-02-02

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_tier AS ENUM ('free', 'creator', 'professional', 'business', 'enterprise');
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'analyst', 'viewer', 'api_only');
CREATE TYPE analysis_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE analysis_type AS ENUM ('image', 'video', 'audio', 'document');
CREATE TYPE verdict_type AS ENUM ('authentic', 'likely_authentic', 'inconclusive', 'likely_ai', 'ai_generated', 'manipulated');
CREATE TYPE api_key_environment AS ENUM ('live', 'test');

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    tier user_tier NOT NULL DEFAULT 'free',
    owner_id UUID NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    role user_role NOT NULL DEFAULT 'owner',
    tier user_tier NOT NULL DEFAULT 'free',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Add foreign key for organization owner after users table exists
ALTER TABLE organizations ADD CONSTRAINT fk_organizations_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT;

-- API Keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_prefix VARCHAR(25) NOT NULL,
    key_hash VARCHAR(64) NOT NULL UNIQUE,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    environment api_key_environment NOT NULL DEFAULT 'live',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    ip_allowlist TEXT[] DEFAULT '{}',
    rate_limit INTEGER NOT NULL DEFAULT 60,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

-- Analyses table
CREATE TABLE analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    type analysis_type NOT NULL,
    status analysis_status NOT NULL DEFAULT 'pending',
    priority INTEGER NOT NULL DEFAULT 5,

    -- File information
    file_key VARCHAR(512),
    file_name VARCHAR(255),
    file_size_bytes BIGINT,
    file_mime_type VARCHAR(100),
    file_hash VARCHAR(64),

    -- Video/Audio specific
    duration_seconds DECIMAL(10, 3),
    resolution VARCHAR(20),
    fps DECIMAL(5, 2),

    -- Processing info
    progress INTEGER DEFAULT 0,
    current_stage VARCHAR(50),
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    processing_time_ms INTEGER,

    -- Options
    options JSONB DEFAULT '{}',
    webhook_url VARCHAR(2048),

    -- External tracking
    external_id VARCHAR(255),
    idempotency_key VARCHAR(255) UNIQUE,
    metadata JSONB DEFAULT '{}',

    -- Error handling
    error_code VARCHAR(50),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Analysis Results table
CREATE TABLE analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,

    -- Overall verdict
    verdict verdict_type NOT NULL,
    confidence DECIMAL(5, 4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    risk_level VARCHAR(20),
    summary TEXT,

    -- Ensemble score
    ensemble_score DECIMAL(5, 4),

    -- Detailed detections (model-by-model)
    detections JSONB DEFAULT '[]',

    -- Heatmap and visualizations
    heatmap_url VARCHAR(2048),
    visualization_urls JSONB DEFAULT '{}',

    -- Metadata analysis
    metadata_analysis JSONB DEFAULT '{}',

    -- Video specific
    video_analysis JSONB,
    audio_analysis JSONB,
    temporal_analysis JSONB,
    face_tracking JSONB DEFAULT '[]',
    manipulation_segments JSONB DEFAULT '[]',

    -- Provenance
    c2pa_verified BOOLEAN,
    c2pa_data JSONB,
    watermark_detected BOOLEAN,
    watermark_type VARCHAR(50),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Batch Analyses table
CREATE TABLE batch_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    status analysis_status NOT NULL DEFAULT 'pending',

    -- Progress tracking
    total_items INTEGER NOT NULL,
    completed_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,

    -- Options
    options JSONB DEFAULT '{}',
    webhook_url VARCHAR(2048),

    -- External tracking
    external_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Batch Items table
CREATE TABLE batch_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES batch_analyses(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES analyses(id) ON DELETE SET NULL,
    item_index INTEGER NOT NULL,
    external_id VARCHAR(255),
    status analysis_status NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Webhooks configuration table
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    url VARCHAR(2048) NOT NULL,
    secret VARCHAR(255) NOT NULL,
    events TEXT[] NOT NULL DEFAULT '{}',

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Statistics
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Webhook deliveries table
CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES analyses(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES batch_analyses(id) ON DELETE SET NULL,

    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,

    -- Delivery status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,

    -- Response info
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ
);

-- Usage tracking table
CREATE TABLE usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Counts
    image_analyses INTEGER DEFAULT 0,
    video_analyses INTEGER DEFAULT 0,
    audio_analyses INTEGER DEFAULT 0,
    batch_analyses INTEGER DEFAULT 0,

    -- Bytes processed
    bytes_processed BIGINT DEFAULT 0,

    -- API calls
    api_calls INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, period_start, period_end)
);

-- Audit log table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,

    ip_address INET,
    user_agent TEXT,

    old_values JSONB,
    new_values JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_organization ON users(organization_id);

-- API Keys
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_organization ON api_keys(organization_id);

-- Analyses
CREATE INDEX idx_analyses_user ON analyses(user_id);
CREATE INDEX idx_analyses_organization ON analyses(organization_id);
CREATE INDEX idx_analyses_status ON analyses(status);
CREATE INDEX idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX idx_analyses_external_id ON analyses(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_analyses_idempotency_key ON analyses(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Analysis Results
CREATE INDEX idx_analysis_results_analysis ON analysis_results(analysis_id);
CREATE INDEX idx_analysis_results_verdict ON analysis_results(verdict);

-- Batch Analyses
CREATE INDEX idx_batch_analyses_user ON batch_analyses(user_id);
CREATE INDEX idx_batch_analyses_status ON batch_analyses(status);

-- Batch Items
CREATE INDEX idx_batch_items_batch ON batch_items(batch_id);
CREATE INDEX idx_batch_items_analysis ON batch_items(analysis_id);

-- Webhooks
CREATE INDEX idx_webhooks_user ON webhooks(user_id);
CREATE INDEX idx_webhooks_organization ON webhooks(organization_id);

-- Webhook Deliveries
CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at) WHERE status = 'pending';

-- Usage
CREATE INDEX idx_usage_user_period ON usage(user_id, period_start);
CREATE INDEX idx_usage_organization_period ON usage(organization_id, period_start);

-- Audit Logs
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_analyses_updated_at BEFORE UPDATE ON analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_batch_analyses_updated_at BEFORE UPDATE ON batch_analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_batch_items_updated_at BEFORE UPDATE ON batch_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usage_updated_at BEFORE UPDATE ON usage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
