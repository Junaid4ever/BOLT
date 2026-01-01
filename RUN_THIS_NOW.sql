-- =====================================================
-- URGENT: Run this SQL in Supabase SQL Editor
-- =====================================================
-- This will enable the "Wrong Credentials" feature
-- Copy and paste this entire code in SQL Editor and click RUN
-- =====================================================

-- Drop the existing constraint
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_status_check;

-- Add new constraint with wrong_credentials included
ALTER TABLE meetings 
ADD CONSTRAINT meetings_status_check
CHECK (status IN ('active', 'not_live', 'cancelled', 'wrong_credentials'));

-- Verify it worked (should return 1 row)
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'meetings_status_check';
