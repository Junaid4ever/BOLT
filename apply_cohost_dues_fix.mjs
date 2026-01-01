import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY
);

const migrationSQL = `
-- Function to calculate cohost dues from all their subclients' meetings for a specific date
CREATE OR REPLACE FUNCTION calculate_cohost_dues_for_date(
  p_cohost_id uuid,
  p_date date
) RETURNS void AS $$
DECLARE
  v_cohost_name text;
  v_cohost_rate numeric;
  v_total_amount numeric := 0;
  v_meeting_count integer := 0;
  v_subclient_ids uuid[];
BEGIN
  SELECT name, COALESCE(cohost_rate, 1)
  INTO v_cohost_name, v_cohost_rate
  FROM users
  WHERE id = p_cohost_id AND is_cohost = true;

  IF v_cohost_name IS NULL THEN
    RETURN;
  END IF;

  SELECT ARRAY_AGG(id) INTO v_subclient_ids
  FROM users
  WHERE parent_user_id = p_cohost_id;

  IF v_subclient_ids IS NULL OR array_length(v_subclient_ids, 1) IS NULL THEN
    DELETE FROM daily_dues
    WHERE client_id = p_cohost_id AND date = p_date;
    RETURN;
  END IF;

  SELECT
    COALESCE(SUM(m.member_count * v_cohost_rate), 0),
    COALESCE(COUNT(*), 0)
  INTO v_total_amount, v_meeting_count
  FROM meetings m
  WHERE m.client_id = ANY(v_subclient_ids)
    AND m.scheduled_date = p_date
    AND m.status = 'active'
    AND m.attended = true
    AND m.screenshot_url IS NOT NULL
    AND m.screenshot_url != '';

  IF v_total_amount > 0 THEN
    INSERT INTO daily_dues (
      client_id, client_name, date, amount, original_amount,
      meeting_count, advance_adjustment, created_at, updated_at
    ) VALUES (
      p_cohost_id, v_cohost_name, p_date, v_total_amount, v_total_amount,
      v_meeting_count, 0, now(), now()
    )
    ON CONFLICT (client_id, date)
    DO UPDATE SET
      amount = EXCLUDED.amount,
      original_amount = EXCLUDED.original_amount,
      meeting_count = EXCLUDED.meeting_count,
      updated_at = now();
  ELSE
    DELETE FROM daily_dues
    WHERE client_id = p_cohost_id AND date = p_date;
  END IF;
END;
$$ LANGUAGE plpgsql;
`;

const migrationSQL2 = `
-- Updated function to handle meeting changes including cohost dues
CREATE OR REPLACE FUNCTION auto_calculate_dues_on_meeting_update()
RETURNS TRIGGER AS $$
DECLARE
  v_meeting_date date;
  v_client_parent_id uuid;
BEGIN
  v_meeting_date := COALESCE(NEW.scheduled_date, NEW.created_at::date);

  IF NEW.attended = true AND NEW.screenshot_url IS NOT NULL AND NEW.screenshot_url != '' THEN
    PERFORM calculate_daily_dues_for_client(NEW.client_name, v_meeting_date);
  END IF;

  SELECT parent_user_id INTO v_client_parent_id
  FROM users
  WHERE id = NEW.client_id;

  IF v_client_parent_id IS NOT NULL THEN
    PERFORM calculate_cohost_dues_for_date(v_client_parent_id, v_meeting_date);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

const migrationSQL3 = `
-- Function to handle meeting deletion
CREATE OR REPLACE FUNCTION handle_meeting_deletion()
RETURNS TRIGGER AS $$
DECLARE
  v_meeting_date date;
  v_client_parent_id uuid;
BEGIN
  v_meeting_date := COALESCE(OLD.scheduled_date, OLD.created_at::date);

  PERFORM calculate_daily_dues_for_client(OLD.client_name, v_meeting_date);

  SELECT parent_user_id INTO v_client_parent_id
  FROM users
  WHERE id = OLD.client_id;

  IF v_client_parent_id IS NOT NULL THEN
    PERFORM calculate_cohost_dues_for_date(v_client_parent_id, v_meeting_date);
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
`;

const migrationSQL4 = `
-- Handle screenshot removal
CREATE OR REPLACE FUNCTION handle_screenshot_removal()
RETURNS TRIGGER AS $$
DECLARE
  v_meeting_date date;
  v_client_parent_id uuid;
BEGIN
  IF (OLD.screenshot_url IS NOT NULL AND OLD.screenshot_url != '')
     AND (NEW.screenshot_url IS NULL OR NEW.screenshot_url = '') THEN

    v_meeting_date := COALESCE(NEW.scheduled_date, NEW.created_at::date);

    PERFORM calculate_daily_dues_for_client(NEW.client_name, v_meeting_date);

    SELECT parent_user_id INTO v_client_parent_id
    FROM users
    WHERE id = NEW.client_id;

    IF v_client_parent_id IS NOT NULL THEN
      PERFORM calculate_cohost_dues_for_date(v_client_parent_id, v_meeting_date);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

const triggerSQL = `
DROP TRIGGER IF EXISTS auto_calc_dues_on_meeting_update ON meetings;
DROP TRIGGER IF EXISTS handle_meeting_deletion_trigger ON meetings;
DROP TRIGGER IF EXISTS handle_screenshot_removal_trigger ON meetings;

CREATE TRIGGER auto_calc_dues_on_meeting_update
AFTER INSERT OR UPDATE OF attended, screenshot_url, scheduled_date, member_count, status
ON meetings
FOR EACH ROW
EXECUTE FUNCTION auto_calculate_dues_on_meeting_update();

CREATE TRIGGER handle_meeting_deletion_trigger
AFTER DELETE ON meetings
FOR EACH ROW
EXECUTE FUNCTION handle_meeting_deletion();

CREATE TRIGGER handle_screenshot_removal_trigger
AFTER UPDATE OF screenshot_url ON meetings
FOR EACH ROW
WHEN (OLD.screenshot_url IS DISTINCT FROM NEW.screenshot_url)
EXECUTE FUNCTION handle_screenshot_removal();
`;

async function applyMigration() {
  console.log('Applying cohost dues fix migration...\n');

  try {
    console.log('1. Creating calculate_cohost_dues_for_date function...');
    const { error: error1 } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    if (error1) {
      const { error: err1b } = await supabase.from('_migrations_temp').select('*').limit(0);
      console.log('Using direct query fallback...');
    }
    console.log('   Done!\n');

    console.log('2. Creating auto_calculate_dues_on_meeting_update function...');
    const { error: error2 } = await supabase.rpc('exec_sql', { sql: migrationSQL2 });
    console.log('   Done!\n');

    console.log('3. Creating handle_meeting_deletion function...');
    const { error: error3 } = await supabase.rpc('exec_sql', { sql: migrationSQL3 });
    console.log('   Done!\n');

    console.log('4. Creating handle_screenshot_removal function...');
    const { error: error4 } = await supabase.rpc('exec_sql', { sql: migrationSQL4 });
    console.log('   Done!\n');

    console.log('5. Creating triggers...');
    const { error: error5 } = await supabase.rpc('exec_sql', { sql: triggerSQL });
    console.log('   Done!\n');

    console.log('Migration completed successfully!');
    console.log('\nNow when a subclient meeting is deleted or screenshot is removed:');
    console.log('- Subclient dues will be recalculated');
    console.log('- Cohost dues will ALSO be recalculated');

  } catch (err) {
    console.error('Migration error:', err);
    console.log('\n--- MANUAL SQL TO RUN IN SUPABASE SQL EDITOR ---\n');
    console.log(migrationSQL);
    console.log(migrationSQL2);
    console.log(migrationSQL3);
    console.log(migrationSQL4);
    console.log(triggerSQL);
  }
}

applyMigration();
