-- ============================================================
-- EMERGENCY: RESTORE ALL CLIENTS BACK
-- ============================================================

-- First, let's see what happened
DO $$
DECLARE
  admin_count INTEGER;
  client_count INTEGER;
  cohost_count INTEGER;
  other_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin' OR is_admin = true;
  SELECT COUNT(*) INTO client_count FROM users WHERE role = 'client';
  SELECT COUNT(*) INTO cohost_count FROM users WHERE role = 'cohost';
  SELECT COUNT(*) INTO other_count FROM users WHERE role NOT IN ('admin', 'client', 'cohost') OR role IS NULL;

  RAISE NOTICE 'Current Status:';
  RAISE NOTICE '  Admins: %', admin_count;
  RAISE NOTICE '  Clients: %', client_count;
  RAISE NOTICE '  Cohosts: %', cohost_count;
  RAISE NOTICE '  Others/NULL: %', other_count;
END $$;

-- ============================================================
-- STEP 1: RESTORE ALL CLIENTS
-- ============================================================

-- Set role to 'client' if NULL
UPDATE users
SET role = 'client'
WHERE role IS NULL;

-- Restore ALL non-admin users to client (cohost_rate doesn't make them cohosts!)
UPDATE users
SET role = 'client'
WHERE is_admin = false;

-- Make sure admins are set correctly
UPDATE users
SET role = 'admin'
WHERE is_admin = true;

-- ============================================================
-- STEP 2: DROP BAD CONSTRAINT AND ADD FLEXIBLE ONE
-- ============================================================

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Allow NULL temporarily for safety
ALTER TABLE users
ADD CONSTRAINT users_role_check
CHECK (role IS NULL OR role IN ('admin', 'cohost', 'client', 'subclient'));

-- ============================================================
-- STEP 3: VERIFY RESTORATION
-- ============================================================

DO $$
DECLARE
  rec RECORD;
  admin_count INTEGER;
  client_count INTEGER;
  cohost_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM users WHERE role = 'admin' OR is_admin = true;
  SELECT COUNT(*) INTO client_count FROM users WHERE role = 'client';
  SELECT COUNT(*) INTO cohost_count FROM users WHERE role = 'cohost';

  RAISE NOTICE '';
  RAISE NOTICE '✅ RESTORATION COMPLETE';
  RAISE NOTICE '================================';
  RAISE NOTICE 'Final Counts:';
  RAISE NOTICE '  Admins: %', admin_count;
  RAISE NOTICE '  Clients: %', client_count;
  RAISE NOTICE '  Cohosts: %', cohost_count;
  RAISE NOTICE '';
  RAISE NOTICE 'All Clients:';

  FOR rec IN
    SELECT name, role, cohost_rate, parent_cohost_id
    FROM users
    WHERE role = 'client' OR (is_admin = false AND role != 'cohost')
    ORDER BY name
  LOOP
    RAISE NOTICE '  ✓ % (role: %)', rec.name, rec.role;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Active Cohosts:';
  FOR rec IN
    SELECT name, role, cohost_rate
    FROM users
    WHERE role = 'cohost'
    ORDER BY name
  LOOP
    RAISE NOTICE '  ✓ % (Rate: Rs %)', rec.name, COALESCE(rec.cohost_rate, 0);
  END LOOP;
END $$;
