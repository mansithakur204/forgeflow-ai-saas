-- Migration 004: Add preview_image column to marketplace_entries
ALTER TABLE marketplace_entries ADD COLUMN IF NOT EXISTS preview_image VARCHAR(255);
