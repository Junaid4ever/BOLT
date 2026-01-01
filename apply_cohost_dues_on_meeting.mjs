import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env file manually
const envFile = readFileSync(join(__dirname, '.env'), 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const migration = `
-- Drop existing function
DROP FUNCTION IF EXISTS calculate_daily_dues();

-- Recreate with cohost dues logic
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
  v_cohost_prefix text;
BEGIN
  v_user_id := COALESCE(NEW.client_id, OLD.client_id);
  v_scheduled_date := COALESCE(NEW.scheduled_date, OLD.scheduled_date);
  v_member_count := COALESCE(NEW.member_count, 0);
  v_member_type := COALESCE(NEW.member_type, 'indians');
  v_attended := COALESCE(NEW.attended, false);

  -- Get user's rate and parent_cohost_id
  SELECT
    CASE
      WHEN v_member_type = 'foreigners' THEN COALESCE(foreign_member_rate, 5)
      ELSE COALESCE(dp_member_price, 4)
    END,
    parent_cohost_id
  INTO v_rate, v_parent_cohost_id
  FROM users
  WHERE id = v_user_id;

  v_payment_amount := v_member_count * v_rate;

  -- If this is a DELETE operation, handle it
  IF TG_OP = 'DELETE' THEN
    DELETE FROM daily_dues
    WHERE user_id = v_user_id
    AND dues_date = v_scheduled_date;

    -- Also remove cohost dues if this was a sub-client meeting
    IF v_parent_cohost_id IS NOT NULL THEN
      DELETE FROM daily_dues
      WHERE user_id = v_parent_cohost_id
      AND dues_date = v_scheduled_date;
    END IF;

    RETURN OLD;
  END IF;

  -- Calculate all dues for this user on this date
  WITH meeting_totals AS (
    SELECT
      SUM(
        CASE
          WHEN m.member_type = 'foreigners' THEN
            m.member_count * COALESCE(u.foreign_member_rate, 5)
          ELSE
            m.member_count * COALESCE(u.dp_member_price, 4)
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
    -- Get cohost rate (80% of cohost_rate)
    SELECT COALESCE(cohost_rate, 3.2) INTO v_cohost_rate
    FROM users
    WHERE id = v_parent_cohost_id;

    v_cohost_dues := v_member_count * v_cohost_rate * 0.8;

    -- Calculate all cohost dues for this date (from all sub-clients)
    WITH cohost_meeting_totals AS (
      SELECT
        SUM(
          m.member_count * COALESCE(u.cohost_rate, 3.2) * 0.8
        ) as total_cohost_dues
      FROM meetings m
      JOIN users sub_client ON sub_client.id = m.client_id
      JOIN users u ON u.id = sub_client.parent_cohost_id
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
`;

async function applyMigration() {
  console.log('🚀 Applying co-host dues migration...');

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: migration });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
    console.log('📋 Co-host dues will now be automatically added when sub-client meetings are attended');
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

applyMigration();
