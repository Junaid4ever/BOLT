-- Allow Same Meeting Multiple Times Per Day at Different Times
-- Drop the old date-only constraint
DROP INDEX IF EXISTS idx_unique_client_meeting_date CASCADE;

-- Add new constraint with date + time
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_client_meeting_datetime
ON meetings (client_name, meeting_id, scheduled_date, hour, minutes)
WHERE status != 'deleted';