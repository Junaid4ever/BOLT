-- ============================================
-- FINAL COHOST SYSTEM FIX - COPY PASTE THIS
-- ============================================

-- Step 1: Add all missing columns to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_cohost'
  ) THEN
    ALTER TABLE users ADD COLUMN is_cohost BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'parent_cohost_id'
  ) THEN
    ALTER TABLE users ADD COLUMN parent_cohost_id uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'cohost_prefix'
  ) THEN
    ALTER TABLE users ADD COLUMN cohost_prefix TEXT UNIQUE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'cohost_rate'
  ) THEN
    ALTER TABLE users ADD COLUMN cohost_rate numeric DEFAULT 1.0;
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_users_parent_cohost_id ON users(parent_cohost_id);
CREATE INDEX IF NOT EXISTS idx_users_cohost_prefix ON users(cohost_prefix);
CREATE INDEX IF NOT EXISTS idx_users_is_cohost ON users(is_cohost);

-- Step 2: Allow cascade delete (Admin can delete clients without foreign key error)
ALTER TABLE meetings
  DROP CONSTRAINT IF EXISTS meetings_client_id_fkey,
  ADD CONSTRAINT meetings_client_id_fkey
    FOREIGN KEY (client_id)
    REFERENCES users(id)
    ON DELETE CASCADE;

-- Step 3: Update calculate_daily_dues function with correct cohost rates
DROP FUNCTION IF EXISTS calculate_daily_dues();

CREATE OR REPLACE FUNCTION calculate_daily_dues()
RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
  v_scheduled_date date;
  v_member_count integer;
  v_member_type text;
  v_rate numeric;
  v_payment_amount numeric;
  v_attended boolean;
  v_parent_cohost_id uuid;
  v_cohost_rate numeric;
  v_cohost_dues numeric;
BEGIN
  v_user_id := COALESCE(NEW.client_id, OLD.client_id);
  v_scheduled_date := COALESCE(NEW.scheduled_date, OLD.scheduled_date);
  v_member_count := COALESCE(NEW.member_count, 0);
  v_member_type := COALESCE(NEW.member_type, 'indian');
  v_attended := COALESCE(NEW.attended, false);

  -- Get user's rate and parent_cohost_id
  SELECT
    CASE
      WHEN v_member_type = 'foreigners' THEN COALESCE(price_per_foreign_member, 5)
      WHEN v_member_type = 'dp' THEN COALESCE(price_per_dp_member, 240)
      ELSE COALESCE(price_per_member, 4)
    END,
    parent_cohost_id
  INTO v_rate, v_parent_cohost_id
  FROM users
  WHERE id = v_user_id;

  -- If this is a DELETE operation, recalculate dues
  IF TG_OP = 'DELETE' THEN
    -- Recalculate user's dues
    WITH meeting_totals AS (
      SELECT
        SUM(
          CASE
            WHEN m.member_type = 'foreigners' THEN
              m.member_count * COALESCE(u.price_per_foreign_member, 5)
            WHEN m.member_type = 'dp' THEN
              m.member_count * COALESCE(u.price_per_dp_member, 240)
            ELSE
              m.member_count * COALESCE(u.price_per_member, 4)
          END
        ) as total_dues
      FROM meetings m
      JOIN users u ON u.id = m.client_id
      WHERE m.client_id = v_user_id
        AND m.scheduled_date = v_scheduled_date
        AND m.attended = true
        AND m.status NOT IN ('deleted', 'cancelled', 'wrong_credentials')
    ),
    adjustment_total AS (
      SELECT COALESCE(SUM(adjustment_amount), 0) as total_adjustment
      FROM due_adjustments
      WHERE user_id = v_user_id
        AND adjustment_date = v_scheduled_date
    )
    INSERT INTO daily_dues (user_id, dues_date, amount_due, updated_at)
    SELECT
      v_user_id,
      v_scheduled_date,
      COALESCE(mt.total_dues, 0) + COALESCE(at.total_adjustment, 0),
      NOW()
    FROM meeting_totals mt
    CROSS JOIN adjustment_total at
    ON CONFLICT (user_id, dues_date)
    DO UPDATE SET
      amount_due = EXCLUDED.amount_due,
      updated_at = NOW();

    -- If this was a sub-client meeting, recalculate cohost dues
    IF v_parent_cohost_id IS NOT NULL THEN
      WITH cohost_meeting_totals AS (
        SELECT
          SUM(m.member_count * COALESCE(u.cohost_rate, 1.0)) as total_cohost_dues
        FROM meetings m
        JOIN users sub_client ON sub_client.id = m.client_id
        JOIN users cohost ON cohost.id = sub_client.parent_cohost_id
        WHERE sub_client.parent_cohost_id = v_parent_cohost_id
          AND m.scheduled_date = v_scheduled_date
          AND m.attended = true
          AND m.status NOT IN ('deleted', 'cancelled', 'wrong_credentials')
      )
      INSERT INTO daily_dues (user_id, dues_date, amount_due, updated_at)
      SELECT
        v_parent_cohost_id,
        v_scheduled_date,
        COALESCE(cmt.total_cohost_dues, 0),
        NOW()
      FROM cohost_meeting_totals cmt
      ON CONFLICT (user_id, dues_date)
      DO UPDATE SET
        amount_due = EXCLUDED.amount_due,
        updated_at = NOW();
    END IF;

    RETURN OLD;
  END IF;

  -- Calculate all dues for this user on this date
  WITH meeting_totals AS (
    SELECT
      SUM(
        CASE
          WHEN m.member_type = 'foreigners' THEN
            m.member_count * COALESCE(u.price_per_foreign_member, 5)
          WHEN m.member_type = 'dp' THEN
            m.member_count * COALESCE(u.price_per_dp_member, 240)
          ELSE
            m.member_count * COALESCE(u.price_per_member, 4)
        END
      ) as total_dues
    FROM meetings m
    JOIN users u ON u.id = m.client_id
    WHERE m.client_id = v_user_id
      AND m.scheduled_date = v_scheduled_date
      AND m.attended = true
      AND m.status NOT IN ('deleted', 'cancelled', 'wrong_credentials')
  ),
  adjustment_total AS (
    SELECT COALESCE(SUM(adjustment_amount), 0) as total_adjustment
    FROM due_adjustments
    WHERE user_id = v_user_id
      AND adjustment_date = v_scheduled_date
  )
  INSERT INTO daily_dues (user_id, dues_date, amount_due, updated_at)
  SELECT
    v_user_id,
    v_scheduled_date,
    COALESCE(mt.total_dues, 0) + COALESCE(at.total_adjustment, 0),
    NOW()
  FROM meeting_totals mt
  CROSS JOIN adjustment_total at
  ON CONFLICT (user_id, dues_date)
  DO UPDATE SET
    amount_due = EXCLUDED.amount_due,
    updated_at = NOW();

  -- If this is a sub-client meeting and it's attended, add cohost dues
  IF v_parent_cohost_id IS NOT NULL AND v_attended THEN
    -- Calculate all cohost dues for this date using cohost_rate
    WITH cohost_meeting_totals AS (
      SELECT
        SUM(m.member_count * COALESCE(cohost.cohost_rate, 1.0)) as total_cohost_dues
      FROM meetings m
      JOIN users sub_client ON sub_client.id = m.client_id
      JOIN users cohost ON cohost.id = sub_client.parent_cohost_id
      WHERE sub_client.parent_cohost_id = v_parent_cohost_id
        AND m.scheduled_date = v_scheduled_date
        AND m.attended = true
        AND m.status NOT IN ('deleted', 'cancelled', 'wrong_credentials')
    )
    INSERT INTO daily_dues (user_id, dues_date, amount_due, updated_at)
    SELECT
      v_parent_cohost_id,
      v_scheduled_date,
      COALESCE(cmt.total_cohost_dues, 0),
      NOW()
    FROM cohost_meeting_totals cmt
    ON CONFLICT (user_id, dues_date)
    DO UPDATE SET
      amount_due = EXCLUDED.amount_due,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate triggers
DROP TRIGGER IF EXISTS meeting_dues_trigger ON meetings;
CREATE TRIGGER meeting_dues_trigger
  AFTER INSERT OR UPDATE OF attended, member_count, member_type, status OR DELETE
  ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_daily_dues();

-- Step 4: Set default rate for sub-clients to 1.20 Rs (Indian members only)
UPDATE users
SET price_per_member = 1.20
WHERE parent_cohost_id IS NOT NULL
  AND (price_per_member IS NULL OR price_per_member = 0.8 OR price_per_member = 4);

-- Done! All fixed!
