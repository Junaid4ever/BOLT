/*
  # Add Co-Host Dues Calculation - FIXED VERSION

  1. Changes
    - When sub-client meeting is marked attended, calculate dues for co-host
    - Co-host is charged admin_rate per member (default 1 INR)
    - Dues stored in daily_dues table for co-host user
    - Automatic calculation on screenshot upload

  2. Important Notes
    - Sub-client meetings have parent_user_id set (the co-host)
    - Admin rate is in users.admin_rate column
    - Both client and co-host get separate daily_dues entries
*/

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

      RAISE NOTICE 'Co-host % charged Rs % for % members (meeting by %)',
        v_cohost_name, (v_member_count * v_admin_rate), v_member_count, NEW.client_name;
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

-- Recalculate all co-host dues from existing attended meetings
DO $$
DECLARE
  v_meeting RECORD;
  v_cohost_id uuid;
  v_cohost_name text;
  v_admin_rate numeric;
  v_meeting_date date;
  v_processed_count integer := 0;
BEGIN
  RAISE NOTICE 'Starting co-host dues recalculation...';

  -- Clear existing co-host dues to recalculate fresh
  -- Co-hosts are users who have other users with parent_user_id pointing to them
  DELETE FROM daily_dues
  WHERE client_id IN (
    SELECT DISTINCT parent_user_id
    FROM users
    WHERE parent_user_id IS NOT NULL
  );

  RAISE NOTICE 'Cleared existing co-host dues';

  -- Loop through all attended meetings from sub-clients
  FOR v_meeting IN
    SELECT m.id, m.client_id, m.client_name, m.member_count,
           COALESCE(m.scheduled_date, m.created_at::date) as meeting_date
    FROM meetings m
    INNER JOIN users u ON m.client_id = u.id
    WHERE u.parent_user_id IS NOT NULL
    AND m.attended = true
    AND m.screenshot_url IS NOT NULL
    AND m.status = 'active'
    ORDER BY m.created_at
  LOOP
    -- Get co-host details
    SELECT u.parent_user_id, p.name, COALESCE(p.admin_rate, 1)
    INTO v_cohost_id, v_cohost_name, v_admin_rate
    FROM users u
    LEFT JOIN users p ON u.parent_user_id = p.id
    WHERE u.id = v_meeting.client_id;

    IF v_cohost_id IS NOT NULL THEN
      v_meeting_date := v_meeting.meeting_date;

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
        v_meeting.member_count * v_admin_rate,
        v_meeting.member_count * v_admin_rate,
        1,
        0,
        now(),
        now()
      )
      ON CONFLICT (client_id, date)
      DO UPDATE SET
        amount = daily_dues.amount + (v_meeting.member_count * v_admin_rate),
        original_amount = daily_dues.original_amount + (v_meeting.member_count * v_admin_rate),
        meeting_count = daily_dues.meeting_count + 1,
        updated_at = now();

      v_processed_count := v_processed_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Co-host dues recalculated successfully! Processed % meetings', v_processed_count;
END $$;
