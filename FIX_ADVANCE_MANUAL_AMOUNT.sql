/*
  # Fix Advance Payment - Store Manual Amount Only

  📋 PROBLEM:
  When adding advance (e.g., 3000 RS), system automatically clears ALL past dues (112150 RS)
  User wants: Store ONLY the manual amount, don't touch past dues

  📋 SOLUTION:
  New simplified function that:
  - Stores only the manually entered advance amount
  - Does NOT automatically clear past dues
  - Starts deducting from advance date onwards

  📋 HOW TO USE:
  1. Copy this entire SQL
  2. Go to: https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql
  3. Paste and click "Run"
  4. Refresh your application

  📋 EXAMPLE:
  Vinod has 3370 RS dues till Dec 20
  Admin adds 3000 RS advance on Dec 21
  Result:
    - Advance stored = 3000 RS (exact amount entered)
    - Past dues (3370 RS) = NOT touched
    - From Dec 21 onwards, meetings will use advance
*/

-- Create new simplified function
CREATE OR REPLACE FUNCTION public.apply_advance_simple(
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
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM users WHERE name = p_client_name;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;

  -- Update advance payment record with manual amount
  UPDATE advance_payments
  SET
    remaining_amount = p_advance_amount,
    remaining_members = FLOOR(p_advance_amount / (SELECT price_per_member FROM users WHERE id = v_user_id)),
    settlement_start_date = p_advance_date,
    is_active = TRUE,
    updated_at = NOW()
  WHERE id = p_advance_id;

  -- Return success message
  RETURN jsonb_build_object(
    'success', true,
    'advance_stored', p_advance_amount,
    'advance_start_date', p_advance_date,
    'message', 'Advance of ₹' || p_advance_amount || ' stored. Will be used from ' || p_advance_date || ' onwards.'
  );

END;
$$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Function created successfully!';
  RAISE NOTICE '✅ Now advance will store only the manual amount';
  RAISE NOTICE '✅ Past dues will NOT be automatically cleared';
END $$;
