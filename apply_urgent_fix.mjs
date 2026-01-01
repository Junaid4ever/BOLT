import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL
});

const sql = `
-- Fix 1: Status Constraint
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_status_check CASCADE;
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS check_status_values CASCADE;
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS status_check CASCADE;
ALTER TABLE meetings ALTER COLUMN status DROP DEFAULT;
ALTER TABLE meetings ADD CONSTRAINT meetings_status_check
  CHECK (status IS NULL OR status IN ('scheduled', 'active', 'completed', 'cancelled', 'attended', 'missed', 'not_live'));

-- Fix 2: Create wrapper functions for triggers
CREATE OR REPLACE FUNCTION trigger_calc_dues_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.attended = TRUE THEN
    PERFORM calculate_daily_dues_for_client(NEW.client_name, NEW.scheduled_date);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_calc_dues_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.attended = TRUE OR OLD.attended = TRUE THEN
    PERFORM calculate_daily_dues_for_client(NEW.client_name, NEW.scheduled_date);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trigger_calc_dues_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.attended = TRUE THEN
    PERFORM calculate_daily_dues_for_client(OLD.client_name, OLD.scheduled_date);
  END IF;
  RETURN OLD;
END;
$$;

-- Fix 3: Drop old triggers
DROP TRIGGER IF EXISTS calculate_dues_on_meeting_insert ON meetings CASCADE;
DROP TRIGGER IF EXISTS calculate_dues_on_meeting_update ON meetings CASCADE;
DROP TRIGGER IF EXISTS calculate_dues_on_meeting_delete ON meetings CASCADE;
DROP TRIGGER IF EXISTS update_daily_dues_on_meeting ON meetings CASCADE;
DROP TRIGGER IF EXISTS trigger_update_daily_dues_on_meeting ON meetings CASCADE;

-- Fix 4: Create new triggers
CREATE TRIGGER calculate_dues_on_meeting_insert
AFTER INSERT ON meetings FOR EACH ROW
EXECUTE FUNCTION trigger_calc_dues_on_insert();

CREATE TRIGGER calculate_dues_on_meeting_update
AFTER UPDATE ON meetings FOR EACH ROW
EXECUTE FUNCTION trigger_calc_dues_on_update();

CREATE TRIGGER calculate_dues_on_meeting_delete
AFTER DELETE ON meetings FOR EACH ROW
EXECUTE FUNCTION trigger_calc_dues_on_delete();
`;

async function applyFix() {
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    await client.query(sql);
    console.log('✅ Applied all fixes');
    
    // Test insert
    const testResult = await client.query(`
      INSERT INTO meetings (meeting_name,meeting_id,password,hour,minutes,time_period,member_count,member_type,attended,status,client_id,client_name,scheduled_date)
      VALUES ('TEST','999999999','TEST',8,50,'PM',30,'indian',false,'scheduled','7f3f3946-9eaa-43cd-9f62-3ddedba12a27','Vijay',CURRENT_DATE)
      RETURNING id
    `);
    
    console.log('✅ Test insert SUCCESS:', testResult.rows[0].id);
    
    // Clean up test
    await client.query(`DELETE FROM meetings WHERE id = $1`, [testResult.rows[0].id]);
    console.log('✅ Test data cleaned');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

applyFix();
