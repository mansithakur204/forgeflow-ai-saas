-- Initial DB migration schema for ForgeFlow AI
-- Targets PostgreSQL (Azure PostgreSQL Flexible Server compatible)

-- 1. Workflows
CREATE TABLE IF NOT EXISTS workflows (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  node_count INTEGER NOT NULL DEFAULT 0,
  run_count INTEGER NOT NULL DEFAULT 0,
  last_run VARCHAR(100),
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  nodes JSONB,
  connections JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_workflows_deleted_at ON workflows(deleted_at) WHERE deleted_at IS NULL;

-- 2. Templates
CREATE TABLE IF NOT EXISTS workflow_templates (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  difficulty VARCHAR(50) NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_runtime VARCHAR(100) NOT NULL,
  required_integrations JSONB NOT NULL DEFAULT '[]'::jsonb,
  preview_image VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  author VARCHAR(100) NOT NULL,
  downloads INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  connections JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  version_lock INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_deleted_at ON workflow_templates(deleted_at) WHERE deleted_at IS NULL;

-- 3. Marketplace
CREATE TABLE IF NOT EXISTS marketplace_entries (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  author VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  downloads INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
  version VARCHAR(50) NOT NULL,
  last_updated VARCHAR(100) NOT NULL,
  license VARCHAR(100) NOT NULL,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  connections JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  reviews JSONB NOT NULL DEFAULT '[]'::jsonb,
  version_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  version_lock INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_marketplace_entries_deleted_at ON marketplace_entries(deleted_at) WHERE deleted_at IS NULL;

-- 4. Settings
CREATE TABLE IF NOT EXISTS workspace_settings (
  id VARCHAR(100) PRIMARY KEY,
  settings JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version_lock INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS workspace_settings_audit_logs (
  id VARCHAR(100) PRIMARY KEY,
  user_name VARCHAR(255) NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  billing_tier VARCHAR(100) NOT NULL,
  owner_email VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version_lock INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS org_members (
  id VARCHAR(100) PRIMARY KEY,
  org_id VARCHAR(100) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS org_invitations (
  id VARCHAR(100) PRIMARY KEY,
  org_id VARCHAR(100) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  token VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  invited_by VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS org_roles (
  org_id VARCHAR(100) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role_name VARCHAR(100) NOT NULL,
  permissions JSONB NOT NULL,
  PRIMARY KEY (org_id, role_name)
);

CREATE TABLE IF NOT EXISTS org_audit_logs (
  id VARCHAR(100) PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_name VARCHAR(255) NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL
);

-- 6. Billing
CREATE TABLE IF NOT EXISTS billing_plans (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price_monthly NUMERIC(10, 2) NOT NULL,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  limits JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id VARCHAR(100) PRIMARY KEY,
  plan_id VARCHAR(100) NOT NULL REFERENCES billing_plans(id),
  status VARCHAR(50) NOT NULL,
  trial_ends_at TIMESTAMPTZ,
  renewal_date TIMESTAMPTZ NOT NULL,
  billing_cycle VARCHAR(50) NOT NULL,
  version_lock INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS billing_usage (
  id VARCHAR(100) PRIMARY KEY,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  workflows_run INTEGER NOT NULL DEFAULT 0,
  storage_mb_used INTEGER NOT NULL DEFAULT 0,
  ai_credits_used INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_invoices (
  id VARCHAR(100) PRIMARY KEY,
  invoice_number VARCHAR(100) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pdf_url VARCHAR(255) NOT NULL
);

-- 7. Integrations
CREATE TABLE IF NOT EXISTS integrations (
  provider_id VARCHAR(100) PRIMARY KEY,
  status VARCHAR(50) NOT NULL,
  health VARCHAR(50) NOT NULL,
  last_sync TIMESTAMPTZ,
  encrypted_secrets JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version_lock INTEGER NOT NULL DEFAULT 1
);

-- 8. Secrets
CREATE TABLE IF NOT EXISTS secrets (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  value TEXT NOT NULL,
  folder VARCHAR(255) NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  last_rotated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usage_count INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_secrets_deleted_at ON secrets(deleted_at) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS secret_versions (
  id VARCHAR(100) PRIMARY KEY,
  secret_id VARCHAR(100) NOT NULL REFERENCES secrets(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS secret_audit_logs (
  id VARCHAR(100) PRIMARY KEY,
  secret_id VARCHAR(100) NOT NULL REFERENCES secrets(id) ON DELETE CASCADE,
  action VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  details TEXT NOT NULL
);

-- 9. API Tokens
CREATE TABLE IF NOT EXISTS api_tokens (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  revoked BOOLEAN NOT NULL DEFAULT FALSE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  requests_today INTEGER NOT NULL DEFAULT 0,
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 60
);

CREATE TABLE IF NOT EXISTS api_request_logs (
  id VARCHAR(100) PRIMARY KEY,
  token_id VARCHAR(100) NOT NULL REFERENCES api_tokens(id) ON DELETE CASCADE,
  token_name VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  status_code INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip VARCHAR(50) NOT NULL
);

-- 10. Execution History (Runs & Logs)
CREATE TABLE IF NOT EXISTS workflow_runs (
  id VARCHAR(100) PRIMARY KEY,
  workflow_id VARCHAR(100) NOT NULL,
  workflow_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  duration_ms INTEGER,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  executed_nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id VARCHAR(100) PRIMARY KEY,
  agent_id VARCHAR(100) NOT NULL,
  agent_name VARCHAR(255) NOT NULL,
  objective TEXT NOT NULL,
  status VARCHAR(50) NOT NULL,
  duration_ms INTEGER,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  tools_used JSONB NOT NULL DEFAULT '[]'::jsonb,
  memory_accessed JSONB NOT NULL DEFAULT '[]'::jsonb,
  output_summary TEXT NOT NULL,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS activity_events (
  id VARCHAR(100) PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(50) NOT NULL,
  actor VARCHAR(255) NOT NULL
);
