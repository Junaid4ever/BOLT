#!/bin/bash

clear
echo "================================================================"
echo "🔥 CO-HOST SYSTEM FIX"
echo "================================================================"
echo ""
echo "❌ Error: cohost_prefix column missing"
echo ""
echo "================================================================"
echo "✅ INSTANT FIX - 3 STEPS (20 seconds)"
echo "================================================================"
echo ""
echo "   1️⃣  Copy this SQL command (Ctrl+C):"
echo ""
cat << 'EOF'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_cohost') THEN
    ALTER TABLE users ADD COLUMN is_cohost BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'parent_user_id') THEN
    ALTER TABLE users ADD COLUMN parent_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'cohost_prefix') THEN
    ALTER TABLE users ADD COLUMN cohost_prefix TEXT UNIQUE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS cohost_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamptz DEFAULT now(),
  admin_response_at timestamptz,
  admin_response_by TEXT,
  UNIQUE(user_id, requested_at)
);

ALTER TABLE cohost_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own requests" ON cohost_requests;
DROP POLICY IF EXISTS "Users can insert their own requests" ON cohost_requests;
DROP POLICY IF EXISTS "Only admins can update requests" ON cohost_requests;
CREATE POLICY "Users can view their own requests" ON cohost_requests FOR SELECT USING (true);
CREATE POLICY "Users can insert their own requests" ON cohost_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Only admins can update requests" ON cohost_requests FOR UPDATE USING (true);
CREATE INDEX IF NOT EXISTS idx_cohost_requests_user_id ON cohost_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cohost_requests_status ON cohost_requests(status);
CREATE INDEX IF NOT EXISTS idx_users_parent_user_id ON users(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_users_cohost_prefix ON users(cohost_prefix);
CREATE INDEX IF NOT EXISTS idx_users_is_cohost ON users(is_cohost);
EOF
echo ""
echo "   2️⃣  Open Supabase SQL Editor:"
echo "       https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql"
echo ""
echo "   3️⃣  Paste (Ctrl+V) and click RUN"
echo ""
echo "================================================================"
echo "✅ DONE! Refresh browser - Error fixed!"
echo "================================================================"
echo ""
echo "OR use the visual page: http://localhost:5173/fix-cohost-now.html"
echo ""
