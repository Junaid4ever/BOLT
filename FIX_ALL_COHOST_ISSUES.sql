/*
  # Complete Co-host System Fix - December 21, 2025

  This migration fixes:
  1. UUID type mismatch in advance_adjustments table
  2. Co-host meetings visibility
  3. Screenshot upload for sub-client meetings
  4. Dues calculation for both cohost and sub-client
*/

-- Fix advance_adjustments.cohost_id type if it's TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'advance_adjustments'
    AND column_name = 'cohost_id'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE advance_adjustments
    ALTER COLUMN cohost_id TYPE uuid USING cohost_id::uuid;

    RAISE NOTICE 'Converted advance_adjustments.cohost_id from TEXT to UUID';
  END IF;
END $$;

-- Fix advance_payments.client_id type if it's TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'advance_payments'
    AND column_name = 'client_id'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE advance_payments
    ALTER COLUMN client_id TYPE uuid USING client_id::uuid;

    RAISE NOTICE 'Converted advance_payments.client_id from TEXT to UUID';
  END IF;
END $$;

-- Add foreign key constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'advance_payments_client_id_fkey'
    AND table_name = 'advance_payments'
  ) THEN
    ALTER TABLE advance_payments
    ADD CONSTRAINT advance_payments_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES users(id);

    RAISE NOTICE 'Added foreign key constraint advance_payments_client_id_fkey';
  END IF;
END $$;

-- Drop existing cohost dues triggers (all variations)
DROP TRIGGER IF EXISTS trigger_calculate_cohost_dues ON meetings;
DROP TRIGGER IF EXISTS trigger_calculate_cohost_dues_on_screenshot ON meetings;

-- Drop function with CASCADE to remove all dependencies
DROP FUNCTION IF EXISTS calculate_cohost_dues_from_subclient_meeting() CASCADE;

-- Create improved cohost dues calculation function
CREATE OR REPLACE FUNCTION calculate_cohost_dues_from_subclient_meeting()
RETURNS TRIGGER AS $$
DECLARE
  v_cohost_id uuid;
  v_admin_rate numeric;
  v_subclient_rate numeric;
  v_meeting_date date;
  v_cohost_amount numeric;
  v_subclient_amount numeric;
  v_cohost_name text;
  v_subclient_name text;
BEGIN
  -- Only process if screenshot is being uploaded/updated
  IF (TG_OP = 'UPDATE' AND OLD.screenshot_url IS DISTINCT FROM NEW.screenshot_url AND NEW.screenshot_url IS NOT NULL AND NEW.screenshot_url != '')
     OR (TG_OP = 'INSERT' AND NEW.screenshot_url IS NOT NULL AND NEW.screenshot_url != '') THEN

    -- Check if this meeting belongs to a cohost (has cohost_id)
    IF NEW.cohost_id IS NOT NULL THEN
      v_meeting_date := COALESCE(NEW.scheduled_date, NEW.created_at::date);

      -- Get cohost details and admin_rate
      SELECT id, name, admin_rate INTO v_cohost_id, v_cohost_name, v_admin_rate
      FROM users
      WHERE id = NEW.cohost_id;

      IF v_cohost_id IS NULL THEN
        RAISE NOTICE 'Cohost not found for cohost_id: %', NEW.cohost_id;
        RETURN NEW;
      END IF;

      -- Get sub-client details and their rate
      SELECT name,
             CASE WHEN NEW.member_type = 'dp' THEN price_per_dp_member ELSE price_per_member END
      INTO v_subclient_name, v_subclient_rate
      FROM users
      WHERE id = NEW.client_id;

      IF v_subclient_name IS NULL THEN
        RAISE NOTICE 'Sub-client not found for client_id: %', NEW.client_id;
        RETURN NEW;
      END IF;

      -- Calculate amounts
      v_cohost_amount := NEW.member_count * COALESCE(v_admin_rate, 1);
      v_subclient_amount := NEW.member_count * COALESCE(v_subclient_rate, 1.1);

      -- Create/Update dues for cohost (cohost owes admin)
      INSERT INTO daily_dues (
        client_id,
        client_name,
        date,
        amount,
        original_amount,
        meeting_count,
        created_at
      ) VALUES (
        v_cohost_id,
        v_cohost_name,
        v_meeting_date,
        v_cohost_amount,
        v_cohost_amount,
        1,
        NOW()
      )
      ON CONFLICT (client_id, date)
      DO UPDATE SET
        amount = daily_dues.amount + v_cohost_amount,
        original_amount = daily_dues.original_amount + v_cohost_amount,
        meeting_count = daily_dues.meeting_count + 1;

      RAISE NOTICE 'Created/Updated cohost dues: cohost=%, amount=%, date=%', v_cohost_name, v_cohost_amount, v_meeting_date;

      -- Create/Update dues for sub-client (sub-client owes cohost)
      INSERT INTO daily_dues (
        client_id,
        client_name,
        date,
        amount,
        original_amount,
        meeting_count,
        created_at
      ) VALUES (
        NEW.client_id,
        v_subclient_name,
        v_meeting_date,
        v_subclient_amount,
        v_subclient_amount,
        1,
        NOW()
      )
      ON CONFLICT (client_id, date)
      DO UPDATE SET
        amount = daily_dues.amount + v_subclient_amount,
        original_amount = daily_dues.original_amount + v_subclient_amount,
        meeting_count = daily_dues.meeting_count + 1;

      RAISE NOTICE 'Created/Updated subclient dues: client=%, amount=%, date=%', v_subclient_name, v_subclient_amount, v_meeting_date;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_calculate_cohost_dues
  AFTER INSERT OR UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_cohost_dues_from_subclient_meeting();

-- Final success message
DO $$
BEGIN
  RAISE NOTICE 'Co-host system fixed successfully!';
END $$;
