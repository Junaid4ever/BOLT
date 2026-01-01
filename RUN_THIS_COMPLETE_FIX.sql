/*
  # COMPLETE FIX - All Issues (December 21, 2024)

  This SQL file fixes:
  1. Adds selected_days column for recurring meetings
  2. Creates co-host dues trigger (if missing)
  3. Adds a test recurring meeting for verification

  Run this in Supabase Dashboard → SQL Editor
*/

-- =================================================================
-- FIX 1: Add selected_days column
-- =================================================================

ALTER TABLE recurring_meeting_templates
ADD COLUMN IF NOT EXISTS selected_days integer[] DEFAULT ARRAY[0,1,2,3,4,5,6];

UPDATE recurring_meeting_templates
SET selected_days = ARRAY[0,1,2,3,4,5,6]
WHERE selected_days IS NULL;

CREATE INDEX IF NOT EXISTS idx_recurring_templates_selected_days
ON recurring_meeting_templates USING GIN (selected_days);

RAISE NOTICE '✅ Fix 1: selected_days column added';

-- =================================================================
-- FIX 2: Co-Host Dues Trigger
-- =================================================================

-- Function to calculate co-host dues when sub-client meeting is attended
CREATE OR REPLACE FUNCTION calculate_cohost_dues_on_meeting()
RETURNS TRIGGER AS $$
DECLARE
  v_cohost_id uuid;
  v_cohost_name text;
  v_admin_rate numeric := 1;
  v_member_count integer;
  v_meeting_date date;
BEGIN
  -- Only process when meeting is marked as attended (screenshot uploaded)
  IF NEW.attended = true AND NEW.screenshot_url IS NOT NULL AND
     (OLD.attended IS NULL OR OLD.attended = false OR OLD.screenshot_url IS NULL) THEN

    -- Get the co-host ID from client's parent_user_id
    SELECT u.parent_user_id, p.name, COALESCE(p.admin_rate, 1)
    INTO v_cohost_id, v_cohost_name, v_admin_rate
    FROM users u
    LEFT JOIN users p ON u.parent_user_id = p.id
    WHERE u.id = NEW.client_id;

    -- Only proceed if this is a sub-client (has parent_user_id)
    IF v_cohost_id IS NOT NULL THEN
      v_member_count := COALESCE(NEW.member_count, 0);
      v_meeting_date := COALESCE(NEW.scheduled_date, CURRENT_DATE);

      -- Insert or update co-host dues
      INSERT INTO daily_dues (
        client_id,
        client_name,
        date,
        amount,
        original_amount,
        meeting_count,
        advance_adjustment,
        created_at,
        updated_at
      ) VALUES (
        v_cohost_id,
        v_cohost_name,
        v_meeting_date,
        v_member_count * v_admin_rate,
        v_member_count * v_admin_rate,
        1,
        0,
        now(),
        now()
      )
      ON CONFLICT (client_id, date)
      DO UPDATE SET
        amount = daily_dues.amount + (v_member_count * v_admin_rate),
        original_amount = daily_dues.original_amount + (v_member_count * v_admin_rate),
        meeting_count = daily_dues.meeting_count + 1,
        updated_at = now();

      RAISE NOTICE 'Co-host % charged Rs % for % members',
        v_cohost_name, (v_member_count * v_admin_rate), v_member_count;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_calculate_cohost_dues ON meetings;

-- Create trigger to calculate co-host dues
CREATE TRIGGER trigger_calculate_cohost_dues
  AFTER INSERT OR UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_cohost_dues_on_meeting();

RAISE NOTICE '✅ Fix 2: Co-host dues trigger created';

-- =================================================================
-- FIX 3: Add Test Recurring Meeting
-- =================================================================

DO $$
DECLARE
  v_client_id uuid;
  v_client_name text;
BEGIN
  -- Get a regular client (not sub-client)
  SELECT id, name INTO v_client_id, v_client_name
  FROM users
  WHERE role = 'client' AND parent_user_id IS NULL
  LIMIT 1;

  IF v_client_id IS NOT NULL THEN
    -- Add test recurring meeting
    INSERT INTO recurring_meeting_templates (
      client_id,
      client_name,
      meeting_name,
      meeting_id,
      password,
      hour,
      minutes,
      time_period,
      member_count,
      member_type,
      is_active,
      selected_days
    ) VALUES (
      v_client_id,
      v_client_name,
      'Daily Test Meeting (AUTO-ADDED)',
      '9999999999',
      'test123',
      2,
      0,
      'PM',
      25,
      'indian',
      true,
      ARRAY[0,1,2,3,4,5,6]
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE '✅ Fix 3: Test recurring meeting added for %', v_client_name;
  ELSE
    RAISE NOTICE '⚠️  No regular clients found';
  END IF;
END $$;

-- =================================================================
-- VERIFICATION
-- =================================================================

DO $$
DECLARE
  v_template_count integer;
  v_trigger_count integer;
BEGIN
  SELECT COUNT(*) INTO v_template_count
  FROM recurring_meeting_templates
  WHERE is_active = true;

  SELECT COUNT(*) INTO v_trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'trigger_calculate_cohost_dues'
  AND event_object_table = 'meetings';

  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '                    ALL FIXES APPLIED!';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 VERIFICATION:';
  RAISE NOTICE '  • Recurring templates: % active', v_template_count;
  RAISE NOTICE '  • Co-host trigger: %', CASE WHEN v_trigger_count > 0 THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Everything is ready!';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Login as admin';
  RAISE NOTICE '2. Click "Fetch and add recurring meetings for today"';
  RAISE NOTICE '3. Should now see: "Found recurring templates: %"', v_template_count;
  RAISE NOTICE '4. Open browser console (F12) to see detailed logs';
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
END $$;
