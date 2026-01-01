-- Fix for dp_member_price error with data cleanup
-- Step 1: Drop problematic triggers
DROP TRIGGER IF EXISTS trigger_calculate_dues_on_screenshot ON meetings CASCADE;
DROP TRIGGER IF EXISTS trigger_update_daily_dues_on_meeting ON meetings CASCADE;
DROP TRIGGER IF EXISTS auto_calc_dues_on_meeting_update ON meetings CASCADE;

-- Step 2: Drop problematic functions
DROP FUNCTION IF EXISTS calculate_dues_on_screenshot() CASCADE;
DROP FUNCTION IF EXISTS update_daily_dues_on_meeting() CASCADE;

-- Step 3: Recreate function WITHOUT dp_member_price reference
CREATE OR REPLACE FUNCTION update_daily_dues_on_meeting()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.screenshot_url IS NOT NULL AND NEW.screenshot_url != '' THEN
    IF NEW.attended = TRUE THEN
      IF (OLD IS NULL OR OLD.screenshot_url IS NULL OR OLD.screenshot_url = '') THEN
        PERFORM calculate_daily_dues_for_client(
          NEW.client_name,
          COALESCE(NEW.scheduled_date, CURRENT_DATE)
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Step 4: Recreate trigger
CREATE TRIGGER trigger_update_daily_dues_on_meeting
  AFTER INSERT OR UPDATE OF screenshot_url, attended ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_dues_on_meeting();

-- Step 5: Fix any invalid status values BEFORE applying constraint
UPDATE meetings
SET status = CASE
  WHEN status IS NULL THEN NULL
  WHEN status IN ('scheduled', 'active', 'completed', 'cancelled', 'attended', 'missed') THEN status
  ELSE 'scheduled'  -- Default invalid values to 'scheduled'
END
WHERE status IS NOT NULL
  AND status NOT IN ('scheduled', 'active', 'completed', 'cancelled', 'attended', 'missed');

-- Step 6: Now safely add the constraint
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_status_check;
ALTER TABLE meetings ADD CONSTRAINT meetings_status_check
  CHECK (status IS NULL OR status IN ('scheduled', 'active', 'completed', 'cancelled', 'attended', 'missed'));

-- Step 7: Test
DO $$
DECLARE test_id UUID;
BEGIN
  INSERT INTO meetings (meeting_name, meeting_id, password, hour, minutes, time_period, member_count, member_type, attended)
  VALUES ('TEST', '999999999', 'test', 8, 0, 'PM', 1, 'indian', false) RETURNING id INTO test_id;
  DELETE FROM meetings WHERE id = test_id;
  RAISE NOTICE 'SUCCESS: Fix applied successfully!';
END $$;
