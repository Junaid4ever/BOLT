# Apply All Fixes - Deployment Guide

This guide explains how to deploy and run the `apply-all-fixes` edge function to apply the SQL migration from `supabase/migrations/20251222150000_fix_selected_days_and_status.sql`.

## What Gets Fixed

The migration applies three critical fixes:

1. **Status Constraint Update**
   - Adds "not_live" status to meetings table
   - Fixes "Mark as Not Live" button error in admin panel

2. **ensure_client_recurring_meetings Function**
   - Adds validation for selected_days before creating meetings
   - Only creates meetings on specified days
   - Fixes issues like Prashant Blockista creating on wrong days

3. **create_todays_recurring_meetings Function**
   - Adds selected_days check for automated creation
   - Ensures midnight auto-creation respects day selection
   - Prevents recurring meetings on unselected days

## Deployment Methods

### Method 1: Via Supabase Dashboard (RECOMMENDED)

This is the easiest and most reliable method.

#### Step 1: Deploy the Edge Function

1. Go to your Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/functions
   ```

2. Click **"New Function"** or **"Deploy function"**

3. Configure the function:
   - **Name**: `apply-all-fixes`
   - **Verify JWT**: Disabled (uncheck)

4. Copy the entire contents from:
   ```
   supabase/functions/apply-all-fixes/index.ts
   ```

5. Paste into the function editor

6. Click **"Deploy"**

7. Wait for deployment to complete (usually 30-60 seconds)

#### Step 2: Apply the Fixes

Choose one of these options:

**Option A: Via Browser (Easiest)**

1. Open in browser:
   ```
   public/apply-all-fixes.html
   ```
   Or if deployed: `https://your-domain.com/apply-all-fixes.html`

2. Click **"Apply All Fixes Now"** button

3. Wait for completion and review results

**Option B: Via Node.js Script**

```bash
node call_apply_all_fixes.mjs
```

**Option C: Via curl**

```bash
curl -X POST \
  https://fkypxitgnfqbfplxokve.supabase.co/functions/v1/apply-all-fixes \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Method 2: Via Supabase CLI

If you have Supabase CLI installed and authenticated:

#### Step 1: Login and Link

```bash
# Login to Supabase
npx supabase login

# Link your project
npx supabase link --project-ref fkypxitgnfqbfplxokve
```

#### Step 2: Deploy Function

```bash
npx supabase functions deploy apply-all-fixes --no-verify-jwt
```

#### Step 3: Call the Function

```bash
node call_apply_all_fixes.mjs
```

### Method 3: Manual SQL Execution

If you prefer to run SQL directly without deploying an edge function:

1. Go to Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql/new
   ```

2. Copy the entire contents of:
   ```
   supabase/migrations/20251222150000_fix_selected_days_and_status.sql
   ```

3. Paste into the SQL editor

4. Click **"Run"** or press `Ctrl/Cmd + Enter`

5. Review the results in the output panel

## Files Created

The following files have been created for this deployment:

### Edge Function
- `supabase/functions/apply-all-fixes/index.ts` - Main edge function code

### Deployment Scripts
- `deploy_apply_all_fixes.mjs` - Attempts CLI deployment
- `deploy_via_api.mjs` - Attempts API deployment
- `call_apply_all_fixes.mjs` - Calls the deployed edge function

### Application Scripts
- `apply_fixes_direct.mjs` - Attempts direct SQL execution
- `apply_all_fixes_complete.mjs` - Complete application with service role key

### Browser Interface
- `public/apply-all-fixes.html` - User-friendly web interface

## Verification

After applying the fixes, verify everything works:

### Test 1: Status Constraint
```sql
-- This should work now (previously failed)
UPDATE meetings
SET status = 'not_live'
WHERE id = 'some_meeting_id';
```

### Test 2: Selected Days Function
```sql
-- Check a template's selected days
SELECT
  client_name,
  meeting_name,
  selected_days
FROM recurring_meeting_templates
WHERE client_name = 'Prashant Blockista';

-- Test the function
SELECT ensure_client_recurring_meetings('Prashant Blockista');
```

### Test 3: Verify Functions Exist
```sql
-- Both should return rows
SELECT * FROM pg_proc WHERE proname = 'ensure_client_recurring_meetings';
SELECT * FROM pg_proc WHERE proname = 'create_todays_recurring_meetings';
```

## Troubleshooting

### Edge Function Returns 404
- The function hasn't been deployed yet
- Deploy it via Supabase Dashboard (Method 1)

### Edge Function Returns "exec_sql does not exist"
- The database is missing the exec_sql helper function
- Use Method 3 (Manual SQL Execution) instead

### "Authorization required" Error
- Check that VITE_SUPABASE_ANON_KEY is correct in .env
- The edge function should use service_role internally

### "Already exists" Warnings
- These are OK - means the fix was previously applied
- The migration is idempotent and can be run multiple times safely

## Migration SQL Details

The migration file contains:

1. **ALTER TABLE** statement for status constraint
2. **CREATE OR REPLACE FUNCTION** for ensure_client_recurring_meetings
3. **CREATE OR REPLACE FUNCTION** for create_todays_recurring_meetings

Total: 3 main SQL operations

Each operation is idempotent and can be safely re-run.

## Next Steps

After successfully applying the fixes:

1. ✅ Test the "Mark as Not Live" button in admin panel
2. ✅ Verify recurring meetings only create on selected days
3. ✅ Check that Prashant Blockista no longer creates wrong day meetings
4. ✅ Monitor midnight auto-creation to ensure it respects day selection

## Support

If you encounter issues:

1. Check the Supabase function logs:
   ```
   https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/functions/apply-all-fixes
   ```

2. View the raw SQL migration:
   ```
   supabase/migrations/20251222150000_fix_selected_days_and_status.sql
   ```

3. Check database errors in Supabase Dashboard > Database > Query logs

## Project URLs

- **Dashboard**: https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve
- **Functions**: https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/functions
- **SQL Editor**: https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql/new
- **API Settings**: https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/settings/api
