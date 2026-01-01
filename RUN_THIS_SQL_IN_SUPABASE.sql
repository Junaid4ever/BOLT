-- Co-Host System Complete Migration
-- Safe: Uses IF NOT EXISTS to prevent errors

-- Add columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_cohost BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cohost_prefix TEXT UNIQUE;

-- Create cohost_requests table
CREATE TABLE IF NOT EXISTS cohost_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamptz DEFAULT now(),
  admin_response_at timestamptz,
  admin_response_by TEXT,
  UNIQUE(user_id, requested_at)
);

-- Enable RLS
ALTER TABLE cohost_requests ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own requests" ON cohost_requests;
DROP POLICY IF EXISTS "Users can insert their own requests" ON cohost_requests;
DROP POLICY IF EXISTS "Only admins can update requests" ON cohost_requests;

CREATE POLICY "Users can view their own requests" ON cohost_requests FOR SELECT USING (true);
CREATE POLICY "Users can insert their own requests" ON cohost_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Only admins can update requests" ON cohost_requests FOR UPDATE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cohost_requests_user_id ON cohost_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cohost_requests_status ON cohost_requests(status);
CREATE INDEX IF NOT EXISTS idx_users_parent_user_id ON users(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_users_cohost_prefix ON users(cohost_prefix);
CREATE INDEX IF NOT EXISTS idx_users_is_cohost ON users(is_cohost);
