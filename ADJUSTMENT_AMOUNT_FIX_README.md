# Fix Adjustment Amount Error - Migration Guide

## Problem
When sub-clients try to add meetings, they encounter an error:
```
column "adjustment_amount" does not exist
```

This happens because the `daily_dues` table is missing the required columns that the `calculate_daily_dues_for_client` function expects.

## Solution
This migration ensures that:
1. The `daily_dues` table has the required `advance_adjustment` and `original_amount` columns
2. The `calculate_daily_dues_for_client` function uses the correct column names

## How to Apply the Migration

### Option 1: Automatic (Recommended)
1. Start your development server if not already running:
   ```bash
   npm run dev
   ```

2. Open the migration runner in your browser:
   ```
   http://localhost:5173/run-adjustment-fix-migration.html
   ```

3. Click the "Run Migration Now" button

4. If successful, you'll see a success message. If it fails, follow Option 2 below.

### Option 2: Manual SQL Execution
If the automatic migration fails, you can run the SQL manually:

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql)

2. Copy the SQL from the file: `/tmp/cc-agent/58752285/project/FIX_ADJUSTMENT_AMOUNT.sql`

3. Paste it in the SQL Editor

4. Click the "Run" button

5. Verify the migration was successful

### Option 3: Command Line (Requires Database Credentials)
If you have direct database access:

```bash
node force_apply_adjustment_fix.mjs
```

This script will try multiple connection methods and credentials.

## Migration Files Created

1. **FIX_ADJUSTMENT_AMOUNT.sql** - The SQL migration file
2. **force_apply_adjustment_fix.mjs** - Command-line migration runner
3. **public/run-adjustment-fix-migration.html** - Web-based migration runner
4. **apply_adjustment_amount_fix.mjs** - Simple migration script

## What This Migration Does

### 1. Adds Missing Columns
Ensures the `daily_dues` table has these columns:
- `advance_adjustment` (numeric 10,2) - Amount deducted from advance payments
- `original_amount` (numeric 10,2) - Original dues amount before adjustments

### 2. Recreates the Calculate Function
Updates the `calculate_daily_dues_for_client` function to:
- Use `advance_adjustment` instead of `adjustment_amount`
- Use `original_amount` for the full amount before advance deduction
- Use `amount` for the final amount after advance deduction

## Verification

After applying the migration, you can verify it worked by:

1. Checking the columns exist:
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'daily_dues'
AND column_name IN ('advance_adjustment', 'original_amount');
```

2. Checking the function exists:
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'calculate_daily_dues_for_client'
AND routine_schema = 'public';
```

3. Testing with a sub-client account - they should now be able to add meetings without errors.

## Troubleshooting

### Error: "exec_sql function does not exist"
This means the database doesn't have the exec_sql helper function. Use Option 2 (Manual SQL Execution) instead.

### Error: "password authentication failed"
The database credentials are incorrect or have changed. Use Option 2 (Manual SQL Execution) instead.

### Still Getting "adjustment_amount does not exist"
1. Verify the migration ran successfully by checking the columns (see Verification section above)
2. Clear your browser cache and reload the application
3. Check the browser console for any additional errors

## Support
If you continue to experience issues after applying this migration, please check:
- The Supabase dashboard for any error logs
- The browser console for JavaScript errors
- The network tab to see the actual error response from the API
