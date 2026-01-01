/*
  # Fix adjustment_amount Error

  1. Problem
    - Error occurs when sub-clients try to add meetings
    - Column "adjustment_amount" does not exist
    - Need to ensure all required columns exist

  2. Solution
    - Verify daily_dues table has correct columns
    - Ensure all triggers reference correct column names
*/

-- Ensure daily_dues has all required columns
DO $$
BEGIN
  -- Check if advance_adjustment exists (should be there)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_dues' AND column_name = 'advance_adjustment'
  ) THEN
    ALTER TABLE daily_dues ADD COLUMN advance_adjustment numeric(10,2) DEFAULT 0;
  END IF;

  -- Check if original_amount exists (should be there)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_dues' AND column_name = 'original_amount'
  ) THEN
    ALTER TABLE daily_dues ADD COLUMN original_amount numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- Drop and recreate the calculate function to ensure it uses correct columns
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
  -- Get client info
  SELECT id, price_per_member, price_per_dp_member
  INTO v_client_id, v_indian_rate, v_dp_rate
  FROM users
  WHERE name = p_client_name;

  IF v_client_id IS NULL THEN
    RETURN;
  END IF;

  -- Calculate total for attended meetings on this date
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

  -- Get active advance payment
  SELECT id, remaining_amount INTO v_advance_id, v_remaining_advance
  FROM advance_payments
  WHERE client_name = p_client_name
    AND is_active = TRUE
    AND (settlement_start_date IS NULL OR settlement_start_date <= p_date)
  ORDER BY created_at DESC
  LIMIT 1;

  -- Calculate how much advance can be used
  IF v_advance_id IS NOT NULL AND v_remaining_advance > 0 THEN
    v_advance_to_use := LEAST(v_total_amount, v_remaining_advance);
  ELSE
    v_advance_to_use := 0;
  END IF;

  -- Insert or update daily dues
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
