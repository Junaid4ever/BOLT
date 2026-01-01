-- FINAL FIX: Remove old constraint and set up new one correctly

-- 1. Show all current status constraints
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'meetings'::regclass
  AND conname LIKE '%status%';

-- 2. Drop ALL status constraints (there might be multiple)
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_status_check CASCADE;
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS check_status_values CASCADE;
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS status_check CASCADE;

-- 3. Remove any default value on status column
ALTER TABLE meetings ALTER COLUMN status DROP DEFAULT;

-- 4. Clean up any invalid existing data
UPDATE meetings
SET status = 'scheduled'
WHERE status = 'active';

UPDATE meetings
SET status = NULL
WHERE status NOT IN ('scheduled', 'completed', 'cancelled', 'attended', 'missed');

-- 5. Add the new comprehensive constraint
ALTER TABLE meetings
  ADD CONSTRAINT meetings_status_check
  CHECK (status IS NULL OR status IN ('scheduled', 'active', 'completed', 'cancelled', 'attended', 'missed'));

-- 6. Verify the fix
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'meetings'::regclass
  AND conname LIKE '%status%';

-- 7. Test with the exact data from the error
DO $$
DECLARE
    test_id UUID;
BEGIN
    INSERT INTO meetings (
        meeting_name,
        meeting_id,
        password,
        hour,
        minutes,
        time_period,
        member_count,
        member_type,
        attended,
        status,
        client_id,
        client_name
    )
    VALUES (
        'Rubix',
        '84761503111',
        'RUBIX',
        8,
        50,
        'PM',
        30,
        'indian',
        false,
        'scheduled',
        '7f3f3946-9eaa-43cd-9f62-3ddedba12a27',
        'Vijay'
    )
    RETURNING id INTO test_id;

    RAISE NOTICE 'SUCCESS: Test insert succeeded with ID: %', test_id;
    DELETE FROM meetings WHERE id = test_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'FAILED: %', SQLERRM;
END $$;
