import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.VITE_SUPABASE_DB_URL
});

const fixSQL = `
-- Drop ALL triggers first
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'meetings'
  LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || r.trigger_name || ' ON meetings CASCADE';
  END LOOP;
END $$;

-- Drop ALL functions
DROP FUNCTION IF EXISTS handle_meeting_change_atomic() CASCADE;
DROP FUNCTION IF EXISTS calculate_daily_dues_for_client(TEXT, DATE) CASCADE;
DROP FUNCTION IF EXISTS restore_dues_on_meeting_deletion() CASCADE;
DROP FUNCTION IF EXISTS handle_meeting_insert() CASCADE;
DROP FUNCTION IF EXISTS handle_meeting_update() CASCADE;
DROP FUNCTION IF EXISTS handle_meeting_delete() CASCADE;

-- Remove old column if exists
ALTER TABLE daily_dues DROP COLUMN IF EXISTS adjustment_amount;

-- Add correct columns
ALTER TABLE daily_dues ADD COLUMN IF NOT EXISTS advance_adjustment numeric(10,2) DEFAULT 0;
ALTER TABLE daily_dues ADD COLUMN IF NOT EXISTS original_amount numeric(10,2) DEFAULT 0;

-- Create the CORRECT trigger function
CREATE OR REPLACE FUNCTION handle_meeting_change_atomic()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_meeting_date DATE;
  v_indian_rate NUMERIC;
  v_dp_rate NUMERIC;
  v_meeting_amount NUMERIC := 0;
  v_advance_id UUID;
  v_remaining_advance NUMERIC := 0;
  v_advance_to_use NUMERIC := 0;
  v_client_name TEXT;
  v_client_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_client_name := OLD.client_name;
    v_client_id := OLD.client_id;
    v_meeting_date := COALESCE(OLD.scheduled_date, OLD.created_at::date);
  ELSE
    v_client_name := NEW.client_name;
    v_client_id := NEW.client_id;
    v_meeting_date := COALESCE(NEW.scheduled_date, NEW.created_at::date);
  END IF;

  SELECT price_per_member, price_per_dp_member
  INTO v_indian_rate, v_dp_rate
  FROM users
  WHERE name = v_client_name;

  SELECT id, remaining_amount INTO v_advance_id, v_remaining_advance
  FROM advance_payments
  WHERE client_name = v_client_name
    AND is_active = TRUE
    AND (settlement_start_date IS NULL OR settlement_start_date <= v_meeting_date)
  ORDER BY created_at DESC
  LIMIT 1;

  IF TG_OP = 'DELETE' THEN
    IF OLD.attended = TRUE AND OLD.screenshot_url IS NOT NULL AND OLD.screenshot_url != '' THEN
      IF OLD.member_type = 'dp' THEN
        v_meeting_amount := OLD.member_count * v_dp_rate;
      ELSE
        v_meeting_amount := OLD.member_count * v_indian_rate;
      END IF;

      IF v_advance_id IS NOT NULL THEN
        UPDATE advance_payments
        SET
          remaining_amount = remaining_amount + v_meeting_amount,
          remaining_members = CASE
            WHEN v_indian_rate > 0 THEN FLOOR((remaining_amount + v_meeting_amount) / v_indian_rate)
            ELSE remaining_members
          END,
          is_active = TRUE,
          updated_at = now()
        WHERE id = v_advance_id;
      END IF;

      UPDATE daily_dues
      SET
        original_amount = GREATEST(0, original_amount - v_meeting_amount),
        advance_adjustment = GREATEST(0, advance_adjustment - LEAST(v_meeting_amount, advance_adjustment)),
        amount = GREATEST(0, amount - GREATEST(0, v_meeting_amount - LEAST(v_meeting_amount, advance_adjustment))),
        meeting_count = GREATEST(0, meeting_count - 1)
      WHERE client_name = v_client_name AND date = v_meeting_date;
    END IF;

    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.attended = TRUE AND NEW.screenshot_url IS NOT NULL AND NEW.screenshot_url != '' THEN
      IF NEW.member_type = 'dp' THEN
        v_meeting_amount := NEW.member_count * v_dp_rate;
      ELSE
        v_meeting_amount := NEW.member_count * v_indian_rate;
      END IF;

      IF v_advance_id IS NOT NULL AND v_remaining_advance > 0 THEN
        v_advance_to_use := LEAST(v_meeting_amount, v_remaining_advance);
      ELSE
        v_advance_to_use := 0;
      END IF;

      IF v_advance_to_use > 0 THEN
        UPDATE advance_payments
        SET
          remaining_amount = remaining_amount - v_advance_to_use,
          remaining_members = CASE
            WHEN v_indian_rate > 0 THEN FLOOR((remaining_amount - v_advance_to_use) / v_indian_rate)
            ELSE 0
          END,
          is_active = CASE WHEN (remaining_amount - v_advance_to_use) > 0 THEN TRUE ELSE FALSE END,
          settlement_end_date = CASE WHEN (remaining_amount - v_advance_to_use) <= 0 THEN v_meeting_date ELSE settlement_end_date END,
          settlement_start_date = COALESCE(settlement_start_date, v_meeting_date),
          last_deduction_date = v_meeting_date,
          updated_at = now()
        WHERE id = v_advance_id;
      END IF;

      INSERT INTO daily_dues (client_id, client_name, date, original_amount, advance_adjustment, amount, meeting_count)
      VALUES (
        v_client_id,
        v_client_name,
        v_meeting_date,
        v_meeting_amount,
        v_advance_to_use,
        v_meeting_amount - v_advance_to_use,
        1
      )
      ON CONFLICT (client_id, date)
      DO UPDATE SET
        original_amount = daily_dues.original_amount + v_meeting_amount,
        advance_adjustment = daily_dues.advance_adjustment + v_advance_to_use,
        amount = daily_dues.amount + (v_meeting_amount - v_advance_to_use),
        meeting_count = daily_dues.meeting_count + 1;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF (OLD.attended != NEW.attended) OR (OLD.screenshot_url IS DISTINCT FROM NEW.screenshot_url) THEN
      PERFORM calculate_daily_dues_for_client(NEW.client_name, v_meeting_date);
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Create calculate function
CREATE OR REPLACE FUNCTION calculate_daily_dues_for_client(p_client_name TEXT, p_date DATE)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_client_id UUID;
  v_indian_rate NUMERIC;
  v_dp_rate NUMERIC;
  v_total_amount NUMERIC := 0;
  v_meeting_count INTEGER := 0;
  v_advance_id UUID;
  v_remaining_advance NUMERIC := 0;
  v_advance_to_use NUMERIC := 0;
BEGIN
  SELECT id, price_per_member, price_per_dp_member
  INTO v_client_id, v_indian_rate, v_dp_rate
  FROM users
  WHERE name = p_client_name;

  IF v_client_id IS NULL THEN
    RETURN;
  END IF;

  SELECT
    COALESCE(SUM(
      CASE
        WHEN m.member_type = 'dp' THEN m.member_count * v_dp_rate
        ELSE m.member_count * v_indian_rate
      END
    ), 0),
    COUNT(*)
  INTO v_total_amount, v_meeting_count
  FROM meetings m
  WHERE m.client_name = p_client_name
    AND m.attended = TRUE
    AND m.screenshot_url IS NOT NULL
    AND m.screenshot_url != ''
    AND COALESCE(m.scheduled_date, m.created_at::date) = p_date;

  SELECT id, remaining_amount INTO v_advance_id, v_remaining_advance
  FROM advance_payments
  WHERE client_name = p_client_name
    AND is_active = TRUE
    AND (settlement_start_date IS NULL OR settlement_start_date <= p_date)
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_advance_id IS NOT NULL AND v_remaining_advance > 0 THEN
    v_advance_to_use := LEAST(v_total_amount, v_remaining_advance);
  ELSE
    v_advance_to_use := 0;
  END IF;

  INSERT INTO daily_dues (
    client_id,
    client_name,
    date,
    original_amount,
    advance_adjustment,
    amount,
    meeting_count
  )
  VALUES (
    v_client_id,
    p_client_name,
    p_date,
    v_total_amount,
    v_advance_to_use,
    v_total_amount - v_advance_to_use,
    v_meeting_count
  )
  ON CONFLICT (client_id, date)
  DO UPDATE SET
    original_amount = v_total_amount,
    advance_adjustment = v_advance_to_use,
    amount = v_total_amount - v_advance_to_use,
    meeting_count = v_meeting_count,
    updated_at = now();
END;
$$;

-- Create the trigger
CREATE TRIGGER trigger_handle_meeting_change_atomic
  AFTER INSERT OR UPDATE OR DELETE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION handle_meeting_change_atomic();
`;

async function fix() {
  try {
    console.log('Connecting to database...');
    await client.connect();

    console.log('Applying emergency fix...');
    await client.query(fixSQL);

    console.log('✅ FIXED! Meeting addition should work now!');

    // Verify
    const result = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'daily_dues'
      AND column_name IN ('adjustment_amount', 'advance_adjustment')
    `);

    console.log('Columns in daily_dues:', result.rows);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

fix();
