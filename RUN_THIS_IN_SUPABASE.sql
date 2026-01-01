/*
  ============================================================
  COMPLETE FIX - December 20, 2025
  ============================================================

  1. Co-Host Dues System (FIXED)
     - Tracks what cohost EARNS from client (cohost_rate * members)
     - Tracks what admin GETS from cohost (admin_rate * members)
     - Cohost profit = cohost_amount - admin_share

  2. Daily Recurring Meetings
     - Add selected_days column (which days of week meeting should occur)
     - Update fetch function to respect selected_days

  Run this SQL in Supabase SQL Editor:
  https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql
  ============================================================
*/

-- ============================================
-- 1. ADD CO-HOST FIELDS TO USERS TABLE
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_cohost'
  ) THEN
    ALTER TABLE users ADD COLUMN is_cohost boolean DEFAULT false;
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
    ALTER TABLE users ADD COLUMN cohost_prefix text;
  END IF;
END $$;

-- ============================================
-- 2. DROP AND RECREATE COHOST_DUES TABLE (WITH CORRECT COLUMNS)
-- ============================================
DROP TABLE IF EXISTS cohost_dues CASCADE;

CREATE TABLE cohost_dues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohost_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cohost_name text NOT NULL,
  client_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  meeting_date date NOT NULL,
  member_count integer NOT NULL DEFAULT 1,
  member_type text NOT NULL DEFAULT 'indian',
  cohost_rate numeric NOT NULL DEFAULT 0,
  admin_rate numeric NOT NULL DEFAULT 0,
  cohost_amount numeric NOT NULL DEFAULT 0,
  admin_share numeric NOT NULL DEFAULT 0,
  cohost_profit numeric NOT NULL DEFAULT 0,
  screenshot_uploaded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cohost_dues DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_parent_user_id ON users(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_users_is_cohost ON users(is_cohost);
CREATE INDEX IF NOT EXISTS idx_users_cohost_prefix ON users(cohost_prefix);
CREATE INDEX IF NOT EXISTS idx_cohost_dues_cohost_id ON cohost_dues(cohost_id);
CREATE INDEX IF NOT EXISTS idx_cohost_dues_client_id ON cohost_dues(client_id);
CREATE INDEX IF NOT EXISTS idx_cohost_dues_meeting_date ON cohost_dues(meeting_date);

-- ============================================
-- 4. ADD SELECTED DAYS TO RECURRING MEETING TEMPLATES
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_meeting_templates' AND column_name = 'selected_days'
  ) THEN
    ALTER TABLE recurring_meeting_templates ADD COLUMN selected_days integer[] DEFAULT ARRAY[0,1,2,3,4,5,6];
  END IF;
END $$;

-- ============================================
-- 5. TRIGGER: CREDIT COHOST WHEN ADMIN UPLOADS SCREENSHOT
-- ============================================
CREATE OR REPLACE FUNCTION credit_cohost_on_screenshot()
RETURNS TRIGGER AS $$
DECLARE
  v_client_parent_id UUID;
  v_cohost_name TEXT;
  v_client_name TEXT;
  v_member_type TEXT;
  v_member_count INT;
  v_cohost_rate NUMERIC;
  v_admin_rate NUMERIC;
  v_cohost_amount NUMERIC;
  v_admin_share NUMERIC;
  v_cohost_profit NUMERIC;
  v_existing_due UUID;
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.screenshot_url IS NOT NULL AND (OLD.screenshot_url IS NULL OR OLD.screenshot_url = '')) THEN
    SELECT parent_user_id, name INTO v_client_parent_id, v_client_name
    FROM users
    WHERE id = NEW.client_id;

    IF v_client_parent_id IS NOT NULL THEN
      SELECT id INTO v_existing_due FROM cohost_dues WHERE meeting_id = NEW.id;

      IF v_existing_due IS NULL THEN
        SELECT name INTO v_cohost_name
        FROM users
        WHERE id = v_client_parent_id;

        v_member_type := COALESCE(NEW.member_type, 'indian');
        v_member_count := COALESCE(NEW.member_count, 1);

        IF v_member_type = 'indian' THEN
          SELECT COALESCE(price_per_member, 1.2) INTO v_cohost_rate
          FROM users WHERE id = v_client_parent_id;
          v_admin_rate := 1.0;
        ELSIF v_member_type = 'foreigners' THEN
          SELECT COALESCE(price_per_foreign_member, 1.2) INTO v_cohost_rate
          FROM users WHERE id = v_client_parent_id;
          v_admin_rate := 1.0;
        ELSIF v_member_type = 'dp' THEN
          SELECT COALESCE(price_per_dp_member, 300) INTO v_cohost_rate
          FROM users WHERE id = v_client_parent_id;
          v_admin_rate := 240;
        ELSE
          v_cohost_rate := 1.2;
          v_admin_rate := 1.0;
        END IF;

        v_cohost_amount := v_cohost_rate * v_member_count;
        v_admin_share := v_admin_rate * v_member_count;
        v_cohost_profit := v_cohost_amount - v_admin_share;

        INSERT INTO cohost_dues (
          cohost_id,
          cohost_name,
          client_id,
          client_name,
          meeting_id,
          meeting_date,
          member_count,
          member_type,
          cohost_rate,
          admin_rate,
          cohost_amount,
          admin_share,
          cohost_profit,
          screenshot_uploaded_at
        ) VALUES (
          v_client_parent_id,
          v_cohost_name,
          NEW.client_id,
          v_client_name,
          NEW.id,
          COALESCE(NEW.scheduled_date, CURRENT_DATE),
          v_member_count,
          v_member_type,
          v_cohost_rate,
          v_admin_rate,
          v_cohost_amount,
          v_admin_share,
          v_cohost_profit,
          now()
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_credit_cohost_on_screenshot ON meetings;

CREATE TRIGGER trigger_credit_cohost_on_screenshot
  AFTER UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION credit_cohost_on_screenshot();

-- ============================================
-- 6. FUNCTION TO GET COHOST SUMMARY
-- ============================================
CREATE OR REPLACE FUNCTION get_cohost_summary(p_cohost_id uuid)
RETURNS TABLE (
  total_cohost_amount numeric,
  total_admin_share numeric,
  total_cohost_profit numeric,
  total_meetings bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(cohost_amount), 0) as total_cohost_amount,
    COALESCE(SUM(admin_share), 0) as total_admin_share,
    COALESCE(SUM(cohost_profit), 0) as total_cohost_profit,
    COUNT(*) as total_meetings
  FROM cohost_dues
  WHERE cohost_id = p_cohost_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. UPDATE FETCH RECURRING MEETINGS FUNCTION (RESPECTS SELECTED_DAYS)
-- ============================================
CREATE OR REPLACE FUNCTION fetch_recurring_for_date(p_date date)
RETURNS TABLE (
  id uuid,
  meeting_name text,
  meeting_id text,
  password text,
  hour integer,
  minutes integer,
  time_period text,
  member_count integer,
  member_type text,
  client_id uuid,
  client_name text
) AS $$
DECLARE
  v_day_of_week integer;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date);

  RETURN QUERY
  SELECT
    rmt.id,
    rmt.meeting_name,
    rmt.meeting_id,
    rmt.password,
    rmt.hour,
    rmt.minutes,
    rmt.time_period,
    rmt.member_count,
    rmt.member_type,
    rmt.client_id,
    rmt.client_name
  FROM recurring_meeting_templates rmt
  WHERE rmt.is_active = true
    AND v_day_of_week = ANY(COALESCE(rmt.selected_days, ARRAY[0,1,2,3,4,5,6]))
    AND NOT EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.meeting_id = rmt.meeting_id
        AND m.client_name = rmt.client_name
        AND m.scheduled_date = p_date
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. UPDATE ENSURE_CLIENT_RECURRING_MEETINGS FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION ensure_client_recurring_meetings(p_client_name text)
RETURNS integer AS $$
DECLARE
  v_count integer := 0;
  v_today date := CURRENT_DATE;
  v_day_of_week integer;
  v_template record;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM v_today);

  FOR v_template IN
    SELECT * FROM recurring_meeting_templates
    WHERE client_name = p_client_name
      AND is_active = true
      AND v_day_of_week = ANY(COALESCE(selected_days, ARRAY[0,1,2,3,4,5,6]))
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM meetings
      WHERE meeting_id = v_template.meeting_id
        AND client_name = v_template.client_name
        AND scheduled_date = v_today
    ) THEN
      INSERT INTO meetings (
        client_id, client_name, meeting_name, meeting_id, password,
        hour, minutes, time_period, member_count, member_type,
        attended, scheduled_date, recurring_template_id, is_recurring
      ) VALUES (
        v_template.client_id, v_template.client_name, v_template.meeting_name,
        v_template.meeting_id, v_template.password, v_template.hour,
        v_template.minutes, v_template.time_period, v_template.member_count,
        v_template.member_type, false, v_today, v_template.id, true
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. ENABLE REALTIME FOR NEW TABLES
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE cohost_dues;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ============================================
-- DONE! All changes applied.
-- ============================================
SELECT 'SUCCESS: All database changes applied!' as result;
