-- Migration 003: Add invited_at column to org_invitations
ALTER TABLE org_invitations ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
