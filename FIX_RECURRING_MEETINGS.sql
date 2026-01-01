/*
  # Fix Recurring Meetings - Add selected_days column

  1. Changes
    - Add selected_days column to recurring_meeting_templates
    - Default to all days [0,1,2,3,4,5,6] for existing records
    - This allows filtering which days of the week meetings should be created

  2. Usage
    - [0,1,2,3,4,5,6] = All days (Sunday=0, Monday=1, etc.)
    - [1,2,3,4,5] = Weekdays only
    - [0,6] = Weekends only
*/

-- Add selected_days column (array of integers, 0=Sunday, 6=Saturday)
ALTER TABLE recurring_meeting_templates
ADD COLUMN IF NOT EXISTS selected_days integer[] DEFAULT ARRAY[0,1,2,3,4,5,6];

-- Update existing records to have all days selected
UPDATE recurring_meeting_templates
SET selected_days = ARRAY[0,1,2,3,4,5,6]
WHERE selected_days IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_recurring_templates_selected_days
ON recurring_meeting_templates USING GIN (selected_days);
