-- URGENT FIX: Copy this entire SQL and run in Supabase SQL Editor

-- Fix 1: Status Constraint
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_status_check CASCADE;
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS check_status_values CASCADE;
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS status_check CASCADE;
ALTER TABLE meetings ALTER COLUMN status DROP DEFAULT;
ALTER TABLE meetings ADD CONSTRAINT meetings_status_check
  CHECK (status IS NULL OR status IN ('scheduled', 'active', 'completed', 'cancelled', 'attended', 'missed', 'not_live'));

-- Fix 2: Create wrapper functions for triggers (can't pass NEW.column directly in EXECUTE)
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

-- Test
DO $$
DECLARE test_id UUID;
BEGIN
  INSERT INTO meetings (meeting_name,meeting_id,password,hour,minutes,time_period,member_count,member_type,attended,status,client_id,client_name,scheduled_date)
  VALUES ('TEST','999999999','TEST',8,50,'PM',30,'indian',false,'scheduled','7f3f3946-9eaa-43cd-9f62-3ddedba12a27','Vijay',CURRENT_DATE)
  RETURNING id INTO test_id;
  RAISE NOTICE '✅ SUCCESS: ID %', test_id;
  DELETE FROM meetings WHERE id = test_id;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE '❌ FAILED: %', SQLERRM; RAISE;
END $$;
