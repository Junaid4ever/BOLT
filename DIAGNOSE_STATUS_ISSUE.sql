-- Comprehensive diagnostic for status constraint issue

-- 1. Check the actual column definition
SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'meetings' AND column_name = 'status';

-- 2. Check for any triggers on meetings table
SELECT tgname, tgtype, proname
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'meetings'::regclass
  AND tgname NOT LIKE 'RI_%';

-- 3. Check for any policies that might be interfering
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'meetings';

-- 4. Try a direct insert test
DO $$
DECLARE
    test_id UUID;
    error_msg TEXT;
BEGIN
    -- Test 1: Insert with status = 'scheduled' explicitly
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
            status
        )
        VALUES (
            'TEST_SCHEDULED',
            '999999999',
            'test',
            8,
            50,
            'PM',
            30,
            'indian',
            false,
            'scheduled'
        )
        RETURNING id INTO test_id;

        RAISE NOTICE 'SUCCESS: Test insert with status=scheduled succeeded. ID: %', test_id;
        DELETE FROM meetings WHERE id = test_id;
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
            RAISE NOTICE 'FAILED: Test insert failed with error: %', error_msg;
    END;

    -- Test 2: Insert without status (should be NULL)
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
            attended
        )
        VALUES (
            'TEST_NULL',
            '999999998',
            'test',
            8,
            50,
            'PM',
            30,
            'indian',
            false
        )
        RETURNING id INTO test_id;

        RAISE NOTICE 'SUCCESS: Test insert without status succeeded. ID: %', test_id;
        DELETE FROM meetings WHERE id = test_id;
    EXCEPTION
        WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
            RAISE NOTICE 'FAILED: Test insert failed with error: %', error_msg;
    END;
END $$;

-- 5. Check if there's a default value being set
SELECT pg_get_expr(adbin, adrelid) as default_value
FROM pg_attrdef
WHERE adrelid = 'meetings'::regclass
  AND adnum = (SELECT attnum FROM pg_attribute WHERE attrelid = 'meetings'::regclass AND attname = 'status');

-- 6. Check the actual constraint definition
SELECT conname, consrc, contype
FROM pg_constraint
WHERE conrelid = 'meetings'::regclass
  AND conname LIKE '%status%';
