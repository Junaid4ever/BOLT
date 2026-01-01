/*
  Run this SQL in Supabase SQL Editor to add 'wrong_credentials' status

  This allows admin to mark meetings with incorrect ID or password
*/

-- Drop the existing constraint
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_status_check;

-- Add new constraint with wrong_credentials included
ALTER TABLE meetings ADD CONSTRAINT meetings_status_check
  CHECK (status IN ('active', 'not_live', 'cancelled', 'wrong_credentials'));
