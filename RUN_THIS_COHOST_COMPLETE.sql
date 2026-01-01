-- COMPLETE COHOST SYSTEM MIGRATION
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql/new

-- Step 1: Add columns to users table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_cohost') THEN
    ALTER TABLE users ADD COLUMN is_cohost BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'parent_user_id') THEN
    ALTER TABLE users ADD COLUMN parent_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'cohost_prefix') THEN
    ALTER TABLE users ADD COLUMN cohost_prefix TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'cohost_user_id') THEN
    ALTER TABLE users ADD COLUMN cohost_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'cohost_rate') THEN
    ALTER TABLE users ADD COLUMN cohost_rate DECIMAL(10,2) DEFAULT 1.20;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'admin_rate') THEN
    ALTER TABLE users ADD COLUMN admin_rate DECIMAL(10,2) DEFAULT 1.00;
  END IF;
END $$;

-- Step 2: Create cohost_requests table
CREATE TABLE IF NOT EXISTS cohost_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamptz DEFAULT now(),
  admin_response_at timestamptz,
  admin_response_by TEXT
);

ALTER TABLE cohost_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all cohost_requests" ON cohost_requests;
CREATE POLICY "Allow all cohost_requests" ON cohost_requests FOR ALL USING (true) WITH CHECK (true);

-- Step 3: Create cohost_dues table
CREATE TABLE IF NOT EXISTS cohost_dues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohost_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meeting_date DATE NOT NULL,
  meeting_id uuid,
  member_count INTEGER NOT NULL DEFAULT 0,
  cohost_rate DECIMAL(10,2) NOT NULL DEFAULT 1.20,
  admin_rate DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  cohost_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  admin_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  cohost_profit DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_paid BOOLEAN DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cohost_dues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all cohost_dues" ON cohost_dues;
CREATE POLICY "Allow all cohost_dues" ON cohost_dues FOR ALL USING (true) WITH CHECK (true);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_cohost_requests_user_id ON cohost_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cohost_requests_status ON cohost_requests(status);
CREATE INDEX IF NOT EXISTS idx_users_parent_user_id ON users(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_users_cohost_prefix ON users(cohost_prefix);
CREATE INDEX IF NOT EXISTS idx_users_is_cohost ON users(is_cohost);
CREATE INDEX IF NOT EXISTS idx_users_cohost_user_id ON users(cohost_user_id);
CREATE INDEX IF NOT EXISTS idx_cohost_dues_cohost_id ON cohost_dues(cohost_id);
CREATE INDEX IF NOT EXISTS idx_cohost_dues_client_id ON cohost_dues(client_id);
CREATE INDEX IF NOT EXISTS idx_cohost_dues_meeting_date ON cohost_dues(meeting_date);

-- Step 5: Add cohost_user_id to payment_methods
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_methods' AND column_name = 'cohost_user_id') THEN
    ALTER TABLE payment_methods ADD COLUMN cohost_user_id uuid REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_methods_cohost_user_id ON payment_methods(cohost_user_id);

-- Step 6: Create storage bucket for QR codes
INSERT INTO storage.buckets (id, name, public)
VALUES ('cohost-qr-codes', 'cohost-qr-codes', true)
ON CONFLICT (id) DO NOTHING;

-- Step 7: Storage policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public read cohost-qr-codes" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated upload cohost-qr-codes" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated update cohost-qr-codes" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated delete cohost-qr-codes" ON storage.objects;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Public read cohost-qr-codes"
ON storage.objects FOR SELECT
USING (bucket_id = 'cohost-qr-codes');

CREATE POLICY "Authenticated upload cohost-qr-codes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'cohost-qr-codes');

CREATE POLICY "Authenticated update cohost-qr-codes"
ON storage.objects FOR UPDATE
USING (bucket_id = 'cohost-qr-codes');

CREATE POLICY "Authenticated delete cohost-qr-codes"
ON storage.objects FOR DELETE
USING (bucket_id = 'cohost-qr-codes');

-- Step 8: Trigger to auto-create cohost_dues when meeting is attended
CREATE OR REPLACE FUNCTION create_cohost_dues_on_meeting()
RETURNS TRIGGER AS $$
DECLARE
  client_user RECORD;
  client_cohost_rate DECIMAL(10,2);
  client_admin_rate DECIMAL(10,2);
  total_members INTEGER;
BEGIN
  IF NEW.status = 'attended' THEN
    SELECT * INTO client_user FROM users WHERE id = NEW.user_id;

    IF client_user.cohost_user_id IS NOT NULL THEN
      client_cohost_rate := COALESCE(client_user.cohost_rate, 1.20);
      client_admin_rate := COALESCE(client_user.admin_rate, 1.00);
      total_members := COALESCE(NEW.member_count, 0);

      INSERT INTO cohost_dues (
        cohost_id, client_id, meeting_date, meeting_id, member_count,
        cohost_rate, admin_rate, cohost_amount, admin_amount, cohost_profit
      ) VALUES (
        client_user.cohost_user_id, NEW.user_id,
        COALESCE(NEW.scheduled_date, CURRENT_DATE), NEW.id, total_members,
        client_cohost_rate, client_admin_rate,
        total_members * client_cohost_rate,
        total_members * client_admin_rate,
        total_members * (client_cohost_rate - client_admin_rate)
      )
      ON CONFLICT (client_id, meeting_date, meeting_id)
      DO UPDATE SET
        member_count = EXCLUDED.member_count,
        cohost_amount = EXCLUDED.cohost_amount,
        admin_amount = EXCLUDED.admin_amount,
        cohost_profit = EXCLUDED.cohost_profit;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_cohost_dues ON meetings;
CREATE TRIGGER trigger_create_cohost_dues
AFTER INSERT OR UPDATE ON meetings
FOR EACH ROW EXECUTE FUNCTION create_cohost_dues_on_meeting();

-- Step 9: Trigger to delete cohost_dues when meeting is deleted
CREATE OR REPLACE FUNCTION delete_cohost_dues_on_meeting_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM cohost_dues WHERE meeting_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_delete_cohost_dues ON meetings;
CREATE TRIGGER trigger_delete_cohost_dues
BEFORE DELETE ON meetings
FOR EACH ROW EXECUTE FUNCTION delete_cohost_dues_on_meeting_delete();

SELECT 'COHOST SYSTEM MIGRATION COMPLETE!' as status;
