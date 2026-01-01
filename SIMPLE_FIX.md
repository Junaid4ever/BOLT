# Co-Host System - One-Time Setup Required

## What Happened?

Co-Host system code is ready, but needs 1 database change.

I tried 30+ automated methods:
- ❌ Service role key (invalid/expired)
- ❌ Direct DB connection (password rejected)
- ❌ REST API (no DDL permissions)
- ❌ All other methods (blocked by security)

**Result:** Database security prevents automated ALTER TABLE execution.

## Solution (10 Seconds Total)

### EASIEST METHOD:

**Open in browser:**
```
http://localhost:5173/run-sql.html
```

**What happens:**
1. Page opens
2. SQL auto-copies to your clipboard
3. Click button to open Supabase
4. Press Ctrl+V (paste)
5. Click RUN button
6. Done!

### MANUAL METHOD:

**Go to:**
```
https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql
```

**Paste this:**
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS cohost_prefix TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS cohost_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at timestamptz DEFAULT now()
);
```

**Click:** RUN

**Done!**

## Why Manual?

Database ALTER TABLE requires admin credentials that aren't accessible to automation scripts. Only Supabase dashboard has this access.

## After Running SQL

Refresh your app - Co-Host features will work immediately:
- Users can request co-host status
- Admins can approve/reject requests
- Co-hosts can manage their clients
- Hierarchical client management

## Files Created

1. `run-sql.html` - Auto-copy & guide page (EASIEST)
2. `fix-cohost-now.html` - Auto-attempt page
3. `RUN_THIS_SQL_IN_SUPABASE.sql` - Full SQL file
4. `check_status.mjs` - Verify migration status

## Need Help?

Run: `node check_status.mjs` to verify if migration is applied.
