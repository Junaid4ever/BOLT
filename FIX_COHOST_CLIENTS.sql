-- =====================================================
-- FIX COHOST CLIENT ASSIGNMENTS
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Check V-Arjun's current state
SELECT
  id,
  name,
  email,
  parent_user_id,
  role,
  CASE
    WHEN parent_user_id IS NULL THEN 'NOT ASSIGNED (Will show in Admin)'
    ELSE 'ASSIGNED TO COHOST'
  END as status
FROM users
WHERE email LIKE 'V-%' OR name LIKE 'V-%' OR email = 'V-Arjun';

-- Step 2: Check Vinod's cohost ID
SELECT
  id,
  name,
  cohost_prefix,
  is_cohost
FROM users
WHERE cohost_prefix = 'V' AND is_cohost = true;

-- Step 3: Fix ALL V-prefix clients automatically
-- This will assign all V- prefix clients to Vinod (cohost with prefix V)
UPDATE users u1
SET parent_user_id = (
  SELECT id FROM users
  WHERE cohost_prefix = 'V' AND is_cohost = true
  LIMIT 1
)
WHERE u1.email LIKE 'V-%'
  AND u1.role = 'client'
  AND u1.parent_user_id IS NULL;

-- Step 4: Verify the fix
SELECT
  u.id,
  u.name,
  u.email,
  u.parent_user_id,
  cohost.name as cohost_name,
  cohost.cohost_prefix
FROM users u
LEFT JOIN users cohost ON cohost.id = u.parent_user_id
WHERE u.email LIKE 'V-%' OR u.name LIKE 'V-%';

-- =====================================================
-- BONUS: Fix ALL misassigned cohost clients
-- =====================================================

-- This will automatically fix ALL clients with prefix format
-- and assign them to the correct cohost

UPDATE users u
SET parent_user_id = (
  SELECT id FROM users cohost
  WHERE cohost.cohost_prefix = SUBSTRING(u.email FROM 1 FOR POSITION('-' IN u.email) - 1)
    AND cohost.is_cohost = true
  LIMIT 1
)
WHERE u.role = 'client'
  AND u.email ~ '^[A-Z]+-'
  AND u.parent_user_id IS NULL
  AND EXISTS (
    SELECT 1 FROM users cohost
    WHERE cohost.cohost_prefix = SUBSTRING(u.email FROM 1 FOR POSITION('-' IN u.email) - 1)
      AND cohost.is_cohost = true
  );

-- Step 5: Final verification - Show all cohost clients
SELECT
  cohost.name as cohost_name,
  cohost.cohost_prefix,
  COUNT(client.id) as total_clients,
  STRING_AGG(client.name, ', ') as client_names
FROM users cohost
LEFT JOIN users client ON client.parent_user_id = cohost.id
WHERE cohost.is_cohost = true
GROUP BY cohost.id, cohost.name, cohost.cohost_prefix
ORDER BY cohost.name;

-- =====================================================
-- DONE!
-- =====================================================
