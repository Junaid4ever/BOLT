/*
  # Fix Advance Payment - Clear Past Dues First

  📋 PROBLEM:
  User adds 3000 RS advance but wants past dues (3370 RS) to be cleared first

  📋 EXPECTED BEHAVIOR:
  Vinod ka 3370 RS due till Dec 20
  Admin adds 3000 RS advance on Dec 21

  Result should be:
    - Use 3000 RS to pay past dues
    - Past dues = 3370 - 3000 = 370 RS remaining
    - Advance = 0 RS (all used for past dues)

  If advance > past dues:
    - Past dues = 0 RS (fully paid)
    - Advance = remaining amount for future

  📋 HOW TO RUN:
  1. Copy this entire SQL
  2. Go to: https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql
  3. Paste and click "Run"
*/

CREATE OR REPLACE FUNCTION public.apply_advance_clear_past_dues(
  p_client_name text,
  p_advance_amount numeric,
  p_advance_date date,
  p_advance_id uuid,
  p_screenshot_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_total_past_dues NUMERIC := 0;
  v_remaining_advance NUMERIC;
  v_dues_after_advance NUMERIC;
  v_payment_created BOOLEAN := FALSE;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM users WHERE name = p_client_name;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;

  -- Calculate total UNPAID dues before today
  SELECT COALESCE(SUM(amount), 0) INTO v_total_past_dues
  FROM daily_dues
  WHERE client_name = p_client_name
  AND date < p_advance_date
  AND amount > 0;

  -- Determine how much advance will remain
  IF p_advance_amount >= v_total_past_dues THEN
    -- Advance is enough to clear all past dues
    v_remaining_advance := p_advance_amount - v_total_past_dues;
    v_dues_after_advance := 0;

    -- Mark all past dues as paid if there were any
    IF v_total_past_dues > 0 THEN
      UPDATE daily_dues
      SET amount = 0
      WHERE client_name = p_client_name
      AND date < p_advance_date
      AND amount > 0;

      -- Create payment entry for cleared dues
      INSERT INTO payments (
        client_id,
        client_name,
        amount,
        payment_date,
        payment_upto_date,
        screenshot_url,
        status,
        approved_by,
        approved_at,
        advance_id,
        advance_used
      ) VALUES (
        v_user_id,
        p_client_name,
        v_total_past_dues,
        p_advance_date,
        p_advance_date - INTERVAL '1 day',
        p_screenshot_url,
        'approved',
        'system',
        NOW(),
        p_advance_id,
        v_total_past_dues
      );

      v_payment_created := TRUE;
    END IF;
  ELSE
    -- Advance is less than past dues
    v_remaining_advance := 0;
    v_dues_after_advance := v_total_past_dues - p_advance_amount;

    -- Proportionally reduce past dues
    IF v_total_past_dues > 0 THEN
      UPDATE daily_dues
      SET amount = ROUND((amount / v_total_past_dues) * v_dues_after_advance, 2)
      WHERE client_name = p_client_name
      AND date < p_advance_date
      AND amount > 0;

      -- Create payment entry for what was paid
      INSERT INTO payments (
        client_id,
        client_name,
        amount,
        payment_date,
        payment_upto_date,
        screenshot_url,
        status,
        approved_by,
        approved_at,
        advance_id,
        advance_used
      ) VALUES (
        v_user_id,
        p_client_name,
        p_advance_amount,
        p_advance_date,
        p_advance_date - INTERVAL '1 day',
        p_screenshot_url,
        'approved',
        'system',
        NOW(),
        p_advance_id,
        p_advance_amount
      );

      v_payment_created := TRUE;
    END IF;
  END IF;

  -- Update advance payment record
  UPDATE advance_payments
  SET
    advance_amount = p_advance_amount,
    remaining_amount = v_remaining_advance,
    remaining_members = FLOOR(v_remaining_advance / (SELECT price_per_member FROM users WHERE id = v_user_id)),
    settlement_start_date = p_advance_date,
    is_active = CASE WHEN v_remaining_advance > 0 THEN TRUE ELSE FALSE END,
    updated_at = NOW()
  WHERE id = p_advance_id;

  -- Return detailed result
  RETURN jsonb_build_object(
    'success', true,
    'advance_given', p_advance_amount,
    'past_dues', v_total_past_dues,
    'dues_cleared', LEAST(p_advance_amount, v_total_past_dues),
    'dues_remaining', v_dues_after_advance,
    'advance_remaining', v_remaining_advance,
    'payment_created', v_payment_created
  );

END;
$$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Function created successfully!';
  RAISE NOTICE '✅ Advance will now clear past dues first';
  RAISE NOTICE '✅ Remaining amount (if any) stored for future';
END $$;
