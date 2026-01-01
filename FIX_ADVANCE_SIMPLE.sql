/*
  # Simple Advance Payment Fix

  📋 WHAT IT DOES:
  1. Admin adds advance (e.g., 3000 RS)
  2. Net due till date = 0 (all past dues cleared)
  3. Payment entry created with screenshot + "Advance settle against this amount"
  4. Advance left = entered amount (for future deductions)
  5. Future meetings will deduct from advance

  📋 HOW TO RUN:
  1. Go to: https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql
  2. Paste this entire SQL
  3. Click "Run"
*/

-- Main function for advance payment
CREATE OR REPLACE FUNCTION public.apply_advance_simple_v2(
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
  v_price_per_member NUMERIC := 100;
BEGIN
  -- Get user ID and price
  SELECT id, COALESCE(price_per_member, 100) INTO v_user_id, v_price_per_member
  FROM users WHERE name = p_client_name;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;

  -- Calculate total past dues (all unpaid dues before today)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_past_dues
  FROM daily_dues
  WHERE client_name = p_client_name
  AND date <= p_advance_date
  AND amount > 0;

  -- Create payment entry for cleared dues (with screenshot and label)
  IF v_total_past_dues > 0 THEN
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
      advance_used,
      notes
    ) VALUES (
      v_user_id,
      p_client_name,
      v_total_past_dues,
      p_advance_date,
      p_advance_date,
      p_screenshot_url,
      'approved',
      'system',
      NOW(),
      p_advance_id,
      0,
      'Advance settle against this amount'
    );

    -- Mark all past dues as paid (amount = 0)
    UPDATE daily_dues
    SET amount = 0, advance_adjustment = COALESCE(advance_adjustment, 0) + amount
    WHERE client_name = p_client_name
    AND date <= p_advance_date
    AND amount > 0;
  END IF;

  -- Update advance payment record - store full amount for future
  UPDATE advance_payments
  SET
    advance_amount = p_advance_amount,
    remaining_amount = p_advance_amount,
    remaining_members = FLOOR(p_advance_amount / v_price_per_member),
    settlement_start_date = p_advance_date,
    is_active = TRUE,
    updated_at = NOW()
  WHERE id = p_advance_id;

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'dues_cleared', v_total_past_dues,
    'advance_stored', p_advance_amount,
    'net_due_now', 0
  );
END;
$$;

-- Add notes column to payments if not exists
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes TEXT;

-- Success
DO $$
BEGIN
  RAISE NOTICE '✅ Advance function created!';
  RAISE NOTICE '✅ Net due will become 0 when advance is added';
  RAISE NOTICE '✅ Payment entry will show "Advance settle against this amount"';
END $$;
