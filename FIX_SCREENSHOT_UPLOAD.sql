/*
  # Fix Screenshot Upload - Disable Problematic Cohost Triggers

  Run this SQL in Supabase SQL Editor:
  https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql

  1. Problem
    - Screenshot upload is failing due to cohost-related triggers
    - Multiple triggers are running on meeting updates and causing conflicts

  2. Solution
    - Temporarily disable problematic cohost triggers
    - Keep essential triggers for dues calculation
    - Screenshot upload will work normally

  3. Triggers being removed
    - trigger_credit_cohost_on_screenshot
    - trigger_create_cohost_dues
    - trigger_calculate_cohost_dues
    - trigger_restore_cohost_dues_on_screenshot_removal
*/

-- Drop problematic cohost triggers that block screenshot upload
DROP TRIGGER IF EXISTS trigger_credit_cohost_on_screenshot ON meetings;
DROP TRIGGER IF EXISTS trigger_create_cohost_dues ON meetings;
DROP TRIGGER IF EXISTS trigger_calculate_cohost_dues ON meetings;
DROP TRIGGER IF EXISTS trigger_restore_cohost_dues_on_screenshot_removal ON meetings;

-- Drop the functions too (CASCADE will remove any remaining triggers)
DROP FUNCTION IF EXISTS credit_cohost_on_screenshot() CASCADE;
DROP FUNCTION IF EXISTS create_cohost_dues_on_meeting() CASCADE;
DROP FUNCTION IF EXISTS calculate_cohost_dues_from_subclient_meeting() CASCADE;
DROP FUNCTION IF EXISTS restore_cohost_dues_on_screenshot_removal() CASCADE;
