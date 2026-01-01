/*
  # Fix Vijay's Dues Calculation - RUN THIS IN SUPABASE SQL EDITOR

  1. Problem
    - Vijay's dues showing incorrect amount (1,02,335.20 instead of actual ~25,358.40)
    - Possible duplicate entries or incorrect is_paid flags

  2. Solution
    - Clear and recalculate all dues for Vijay from October 1, 2024 to today
    - Ensure no duplicate entries
    - Recalculate with correct advance deduction logic
*/

-- Step 1: Delete all existing dues for Vijay (we'll recalculate them)
DELETE FROM daily_dues
WHERE client_name = 'Vijay'
  AND date >= '2024-10-01';

-- Step 2: Recalculate all dues for Vijay from Oct 1 to today
DO $$
DECLARE
  current_date date;
BEGIN
  FOR current_date IN
    SELECT generate_series::date
    FROM generate_series(
      '2024-10-01'::date,
      CURRENT_DATE,
      '1 day'::interval
    )
  LOOP
    PERFORM calculate_daily_dues_for_client('Vijay', current_date::text);
  END LOOP;
END $$;

-- Step 3: Mark paid dues correctly based on payment_upto_date
UPDATE daily_dues dd
SET is_paid = true
WHERE dd.client_name = 'Vijay'
  AND EXISTS (
    SELECT 1 FROM payments p
    WHERE p.client_name = 'Vijay'
      AND p.status = 'approved'
      AND dd.date <= p.payment_upto_date
  );

-- Step 4: Verify the fix - show the current total unpaid dues
SELECT
  'Vijay Dues Fixed!' as message,
  COUNT(*) as unpaid_days,
  SUM(total_due) as total_unpaid_due
FROM daily_dues
WHERE client_name = 'Vijay'
  AND is_paid = false;
