-- Check Vijay's Dues Issue
-- Run these queries in Supabase SQL Editor to diagnose the problem

-- 1. Check all dues for Vijay
SELECT
  date,
  daily_earnings,
  advance_adjustment,
  manual_adjustment,
  total_due,
  is_paid
FROM daily_dues
WHERE client_name = 'Vijay'
ORDER BY date DESC
LIMIT 30;

-- 2. Check all payments made by Vijay
SELECT
  payment_date,
  payment_upto_date,
  amount,
  status,
  created_at
FROM payments
WHERE client_name = 'Vijay'
ORDER BY created_at DESC;

-- 3. Check meetings for Vijay
SELECT
  scheduled_date,
  status,
  member_count,
  member_type,
  screenshot_url
FROM meetings
WHERE client_name = 'Vijay'
  AND status = 'attended'
ORDER BY scheduled_date DESC
LIMIT 50;

-- 4. Calculate what the actual due should be
-- This will show unsettled dues after the last payment
WITH last_payment AS (
  SELECT payment_upto_date
  FROM payments
  WHERE client_name = 'Vijay'
    AND status = 'approved'
  ORDER BY payment_upto_date DESC
  LIMIT 1
)
SELECT
  SUM(total_due) as actual_total_due,
  COUNT(*) as days_count
FROM daily_dues
WHERE client_name = 'Vijay'
  AND is_paid = false
  AND date > (SELECT payment_upto_date FROM last_payment);

-- 5. If calculation shows 25,358.40 but UI shows 1,02,335.20
-- Check for duplicate entries or incorrect is_paid flags:
SELECT date, COUNT(*) as count, SUM(total_due) as sum_due
FROM daily_dues
WHERE client_name = 'Vijay'
GROUP BY date
HAVING COUNT(*) > 1
ORDER BY date DESC;

-- 6. Fix: Recalculate all dues for Vijay
-- Run this ONLY if you've confirmed the data is wrong
SELECT calculate_daily_dues_for_client('Vijay', date::text)
FROM generate_series(
  '2024-10-01'::date,
  CURRENT_DATE,
  '1 day'::interval
) as date;

-- 7. Manual fix if needed (adjust the amount as per actual calculation)
-- UPDATE daily_dues
-- SET total_due = 25358.40
-- WHERE client_name = 'Vijay'
-- AND date = '2024-12-18';
