import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres.fkypxitgnfqbfplxokve:Sourabhmnnit@1@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
});

const migration = `
-- Step 1: Remove ALL old triggers
DROP TRIGGER IF EXISTS trigger_credit_cohost_on_screenshot ON meetings;
DROP TRIGGER IF EXISTS trigger_create_cohost_dues ON meetings;
DROP TRIGGER IF EXISTS trigger_calculate_cohost_dues ON meetings;
DROP TRIGGER IF EXISTS trigger_restore_cohost_dues_on_screenshot_removal ON meetings;
DROP TRIGGER IF EXISTS auto_calc_dues_on_meeting_update ON meetings;
DROP TRIGGER IF EXISTS trigger_handle_meeting_change_atomic ON meetings;
DROP TRIGGER IF EXISTS trigger_calculate_dues_on_screenshot ON meetings;

-- Step 2: Remove old functions
DROP FUNCTION IF EXISTS credit_cohost_on_screenshot() CASCADE;
DROP FUNCTION IF EXISTS create_cohost_dues_on_meeting() CASCADE;
DROP FUNCTION IF EXISTS calculate_cohost_dues_from_subclient_meeting() CASCADE;
DROP FUNCTION IF EXISTS restore_cohost_dues_on_screenshot_removal() CASCADE;
DROP FUNCTION IF EXISTS auto_calculate_dues_on_meeting_update() CASCADE;
DROP FUNCTION IF EXISTS handle_meeting_change_atomic() CASCADE;
DROP FUNCTION IF EXISTS calculate_dues_on_screenshot() CASCADE;

-- Step 3: Create SIMPLE function with correct column names
CREATE OR REPLACE FUNCTION simple_screenshot_billing()
RETURNS TRIGGER AS $$
DECLARE
  v_client_rate NUMERIC;
  v_due_amount NUMERIC;
  v_admin_id UUID;
  v_admin_name TEXT;
  v_cohost_name TEXT;
  v_admin_rate NUMERIC;
  v_cohost_rate NUMERIC;
BEGIN
  -- Only when screenshot is JUST uploaded
  IF NEW.screenshot_url IS NOT NULL
     AND NEW.screenshot_url != ''
     AND (OLD.screenshot_url IS NULL OR OLD.screenshot_url = '') THEN

    -- Only if we have valid data
    IF NEW.scheduled_date IS NOT NULL
       AND NEW.member_count > 0
       AND NEW.client_name IS NOT NULL THEN

      -- Get the correct rate based on member type
      IF NEW.member_type = 'foreigners' THEN
        SELECT COALESCE(price_per_foreign_member, 0.8) INTO v_client_rate
        FROM users WHERE id = NEW.client_id;
      ELSIF NEW.member_type = 'dp' THEN
        SELECT COALESCE(price_per_dp_member, 240) INTO v_client_rate
        FROM users WHERE id = NEW.client_id;
      ELSE
        SELECT COALESCE(price_per_member, 0.8) INTO v_client_rate
        FROM users WHERE id = NEW.client_id;
      END IF;

      v_due_amount := v_client_rate * NEW.member_count;

      -- Create client due
      IF v_due_amount > 0 THEN
        INSERT INTO daily_dues (client_id, client_name, date, amount, created_at)
        VALUES (NEW.client_id, NEW.client_name, NEW.scheduled_date, v_due_amount, NOW())
        ON CONFLICT (client_name, date)
        DO UPDATE SET amount = daily_dues.amount + v_due_amount;
      END IF;

      -- If this is a cohost meeting, create admin and cohost dues
      IF NEW.cohost_id IS NOT NULL THEN
        -- Get admin details
        SELECT id, name INTO v_admin_id, v_admin_name
        FROM users
        WHERE role = 'admin'
        LIMIT 1;

        -- Get cohost name and rates
        SELECT
          name,
          COALESCE(admin_rate, 1.0),
          COALESCE(cohost_rate, 1.0)
        INTO v_cohost_name, v_admin_rate, v_cohost_rate
        FROM users
        WHERE id = NEW.cohost_id;

        -- Admin due
        IF v_admin_id IS NOT NULL AND v_admin_name IS NOT NULL AND v_admin_rate > 0 THEN
          INSERT INTO daily_dues (client_id, client_name, date, amount, created_at)
          VALUES (v_admin_id, v_admin_name, NEW.scheduled_date, v_admin_rate * NEW.member_count, NOW())
          ON CONFLICT (client_name, date)
          DO UPDATE SET amount = daily_dues.amount + (v_admin_rate * NEW.member_count);
        END IF;

        -- Cohost due
        IF v_cohost_name IS NOT NULL AND v_cohost_rate > 0 THEN
          INSERT INTO daily_dues (client_id, client_name, date, amount, created_at)
          VALUES (NEW.cohost_id, v_cohost_name, NEW.scheduled_date, v_cohost_rate * NEW.member_count, NOW())
          ON CONFLICT (client_name, date)
          DO UPDATE SET amount = daily_dues.amount + (v_cohost_rate * NEW.member_count);
        END IF;
      END IF;

      -- Mark as attended
      NEW.attended := true;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger
CREATE TRIGGER trigger_simple_screenshot_billing
  BEFORE UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION simple_screenshot_billing();

-- Step 5: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_meetings_cohost_id ON meetings(cohost_id) WHERE cohost_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_daily_dues_lookup ON daily_dues(client_name, date);
`;

try {
  await client.connect();
  console.log('Connected to database...');

  await client.query(migration);
  console.log('✅ Screenshot upload fix applied successfully!');

  await client.end();
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  await client.end();
  process.exit(1);
}
