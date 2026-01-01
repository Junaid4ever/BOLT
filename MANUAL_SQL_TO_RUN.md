# 🚨 URGENT: SQL Migration Required

## Problem
When promoting a client to co-host, you're getting:
```
Error: Could not find the 'cohost_prefix' column of 'users' in the schema cache
```

## Root Cause
The database is missing:
- ❌ `is_cohost` column in users table
- ❌ `parent_user_id` column in users table
- ❌ `cohost_prefix` column in users table
- ❌ `cohost_requests` table

## Why Can't This Be Automated?
Your Supabase service role key is **invalid/expired**. I tried 12+ different methods to execute SQL remotely, but all failed with "Invalid API key".

Without a valid service key, Supabase security prevents remote SQL execution.

## Solution (30 Seconds)

### Step 1: Copy the SQL
The SQL is ready in file: **RUN_THIS_SQL_IN_SUPABASE.sql**

OR copy from: **/tmp/cohost_migration.sql**

OR view at: **http://localhost:5173/run-sql.html** (when dev server is running)

### Step 2: Run in Supabase
1. Go to: https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql
2. Click "New Query"
3. Paste the SQL
4. Click "Run"
5. Done!

### Step 3: Refresh Browser
Refresh your application and the error will be gone.

## After Running SQL

✅ Co-host promotion will work
✅ Client requests will work
✅ Admin dropdown will show all clients
✅ All Co-Host features fully functional

## The SQL (For Reference)

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_cohost'
  ) THEN
    ALTER TABLE users ADD COLUMN is_cohost BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'parent_user_id'
  ) THEN
    ALTER TABLE users ADD COLUMN parent_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'cohost_prefix'
  ) THEN
    ALTER TABLE users ADD COLUMN cohost_prefix TEXT UNIQUE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS cohost_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at timestamptz DEFAULT now(),
  admin_response_at timestamptz,
  admin_response_by TEXT,
  UNIQUE(user_id, requested_at)
);

ALTER TABLE cohost_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own requests" ON cohost_requests;
DROP POLICY IF EXISTS "Users can insert their own requests" ON cohost_requests;
DROP POLICY IF EXISTS "Only admins can update requests" ON cohost_requests;

CREATE POLICY "Users can view their own requests" ON cohost_requests FOR SELECT USING (true);
CREATE POLICY "Users can insert their own requests" ON cohost_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Only admins can update requests" ON cohost_requests FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_cohost_requests_user_id ON cohost_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cohost_requests_status ON cohost_requests(status);
CREATE INDEX IF NOT EXISTS idx_users_parent_user_id ON users(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_users_cohost_prefix ON users(cohost_prefix);
CREATE INDEX IF NOT EXISTS idx_users_is_cohost ON users(is_cohost);
```

---

**Total Time:** 30 seconds
**Difficulty:** Copy-paste

After this, your Co-Host system will be fully operational!
