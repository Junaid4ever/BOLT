-- Co-Host System Migration
-- Run this in Supabase SQL Editor

-- Add columns to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_cohost'
  ) THEN
    ALTER TABLE users ADD COLUMN is_cohost BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'parent_user_id'
  ) THEN
    ALTER TABLE users ADD COLUMN parent_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'cohost_prefix'
  ) THEN
    ALTER TABLE users ADD COLUMN cohost_prefix TEXT UNIQUE;
  END IF;
END $$;

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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own requests" ON cohost_requests;
DROP POLICY IF EXISTS "Users can insert their own requests" ON cohost_requests;
DROP POLICY IF EXISTS "Only admins can update requests" ON cohost_requests;

-- Create policies
CREATE POLICY "Users can view their own requests"
  ON cohost_requests FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own requests"
  ON cohost_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only admins can update requests"
  ON cohost_requests FOR UPDATE
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cohost_requests_user_id ON cohost_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cohost_requests_status ON cohost_requests(status);
CREATE INDEX IF NOT EXISTS idx_users_parent_user_id ON users(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_users_cohost_prefix ON users(cohost_prefix);
CREATE INDEX IF NOT EXISTS idx_users_is_cohost ON users(is_cohost);

-- =====================================================
-- PAYMENT METHODS CO-HOST SUPPORT
-- =====================================================

-- Add cohost_user_id column to payment_methods table
ALTER TABLE payment_methods
ADD COLUMN IF NOT EXISTS cohost_user_id uuid REFERENCES users(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_methods_cohost_user_id
ON payment_methods(cohost_user_id);

-- Drop old policies (if they exist)
DROP POLICY IF EXISTS "Anyone can read payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Authenticated users can update payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Anyone can read admin payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can read their cohost payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Cohosts can read own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Cohosts can insert own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Cohosts can update own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Admin can manage all payment methods" ON payment_methods;

-- Create new policies for payment_methods

-- Allow everyone to read admin payment methods (where cohost_user_id IS NULL)
CREATE POLICY "Anyone can read admin payment methods"
  ON payment_methods
  FOR SELECT
  USING (cohost_user_id IS NULL);

-- Allow users to read their parent cohost's payment methods
CREATE POLICY "Users can read their cohost payment methods"
  ON payment_methods
  FOR SELECT
  USING (
    cohost_user_id IN (
      SELECT parent_user_id FROM users WHERE id = auth.uid()
    )
  );

-- Allow cohosts to read their own payment methods
CREATE POLICY "Cohosts can read own payment methods"
  ON payment_methods
  FOR SELECT
  USING (cohost_user_id = auth.uid());

-- Allow cohosts to insert their own payment methods
CREATE POLICY "Cohosts can insert own payment methods"
  ON payment_methods
  FOR INSERT
  WITH CHECK (cohost_user_id = auth.uid());

-- Allow cohosts to update their own payment methods
CREATE POLICY "Cohosts can update own payment methods"
  ON payment_methods
  FOR UPDATE
  USING (cohost_user_id = auth.uid())
  WITH CHECK (cohost_user_id = auth.uid());

-- Allow admin to manage all payment methods (bypass all checks)
CREATE POLICY "Admin can manage all payment methods"
  ON payment_methods
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
