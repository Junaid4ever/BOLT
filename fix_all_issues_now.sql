-- COMPLETE FIX: All issues at once

-- ==========================================
-- PART 1: Fix Status Constraint
-- ==========================================

-- Drop old status constraints
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_status_check CASCADE;
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS check_status_values CASCADE;
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS status_check CASCADE;

-- Remove default value on status
ALTER TABLE meetings ALTER COLUMN status DROP DEFAULT;

-- Add new comprehensive constraint
ALTER TABLE meetings
  ADD CONSTRAINT meetings_status_check
  CHECK (status IS NULL OR status IN ('scheduled', 'active', 'completed', 'cancelled', 'attended', 'missed', 'not_live'));

-- ==========================================
-- PART 2: Fix dp_member_price references
-- ==========================================

-- List all triggers on meetings table
SELECT
  tgname as trigger_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'meetings'::regclass
  AND tgname NOT LIKE 'RI_%'
  AND tgname NOT LIKE 'pg_%';

-- Find all functions that reference dp_member_price in meetings context
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN
    SELECT proname, prosrc
    FROM pg_proc
    WHERE prosrc LIKE '%dp_member_price%'
      AND prosrc LIKE '%meetings%'
  LOOP
    RAISE NOTICE 'Found function with dp_member_price: %', func_record.proname;
  END LOOP;
END $$;

-- Drop any problematic triggers that might exist
DROP TRIGGER IF EXISTS calculate_dues_on_meeting_insert ON meetings CASCADE;
DROP TRIGGER IF EXISTS calculate_dues_on_meeting_update ON meetings CASCADE;
DROP TRIGGER IF EXISTS calculate_dues_on_meeting_delete ON meetings CASCADE;
DROP TRIGGER IF EXISTS update_daily_dues_on_meeting ON meetings CASCADE;

-- Recreate the correct triggers using the working function
CREATE TRIGGER calculate_dues_on_meeting_insert
AFTER INSERT ON meetings
FOR EACH ROW
WHEN (NEW.attended = TRUE)
EXECUTE FUNCTION calculate_daily_dues_for_client(NEW.client_name, NEW.scheduled_date);

CREATE TRIGGER calculate_dues_on_meeting_update
AFTER UPDATE ON meetings
FOR EACH ROW
WHEN (NEW.attended = TRUE OR OLD.attended = TRUE)
EXECUTE FUNCTION calculate_daily_dues_for_client(NEW.client_name, NEW.scheduled_date);

CREATE TRIGGER calculate_dues_on_meeting_delete
AFTER DELETE ON meetings
FOR EACH ROW
WHEN (OLD.attended = TRUE)
EXECUTE FUNCTION calculate_daily_dues_for_client(OLD.client_name, OLD.scheduled_date);

-- ==========================================
-- PART 3: Verify the fix
-- ==========================================

-- Test insert with the exact data from the error
DO $$
DECLARE
    test_id UUID;
BEGIN
    INSERT INTO meetings (
        meeting_name,
        meeting_id,
        password,
        hour,
        minutes,
        time_period,
        member_count,
        member_type,
        attended,
        status,
        client_id,
        client_name,
        scheduled_date
    )
    VALUES (
        'TEST_MEETING',
        '999999999',
        'TEST',
        8,
        50,
        'PM',
        30,
        'indian',
        false,
        'scheduled',
        '7f3f3946-9eaa-43cd-9f62-3ddedba12a27',
        'Vijay',
        CURRENT_DATE
    )
    RETURNING id INTO test_id;

    RAISE NOTICE '✅ SUCCESS: Test insert succeeded with ID: %', test_id;

    -- Clean up test data
    DELETE FROM meetings WHERE id = test_id;
    RAISE NOTICE '✅ Test data cleaned up';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ FAILED: %', SQLERRM;
        RAISE EXCEPTION '%', SQLERRM;
END $$;

-- Show final status
SELECT
  'Status Constraint' as fix_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'meetings'::regclass
  AND conname = 'meetings_status_check'

UNION ALL

SELECT
  'Active Triggers' as fix_type,
  tgname || ' -> ' || (SELECT proname FROM pg_proc WHERE oid = t.tgfoid) as definition
FROM pg_trigger t
WHERE tgrelid = 'meetings'::regclass
  AND tgname NOT LIKE 'RI_%'
  AND tgname NOT LIKE 'pg_%';
