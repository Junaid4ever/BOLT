# Co-host Dues System - Complete Implementation

## Overview
When a co-host's sub-client schedules a meeting and admin uploads screenshot, the system automatically creates dues for both the co-host and sub-client.

## How It Works

### Flow:
1. **Sub-client creates meeting** → Meeting gets `cohost_id` automatically set (from `parent_user_id`)
2. **Admin uploads screenshot** → Trigger fires
3. **Dues created for:**
   - **Co-host** (owes admin at `admin_rate`)
   - **Sub-client** (owes co-host at their `price_per_member`)

### Example:
```
Sub-client: Raj (belongs to co-host Vijay)
Meeting: 50 members

Admin's admin_rate: Rs.1 per member
Raj's rate: Rs.1.1 per member

When admin uploads screenshot:
✓ Vijay's dues += Rs.50 (owes admin)
✓ Raj's dues += Rs.55 (owes Vijay)
```

## What Was Fixed

### 1. Advance Payments UI Removed
- Removed from AdminPanel
- Removed from ClientPanel
- Removed from CohostClientDashboard
- Database tables untouched

### 2. Screenshot Upload Error Fixed
**Problem:** `operator does not exist: text = uuid`
**Solution:** `advance_payments.client_id` converted from TEXT to UUID

### 3. Co-host Dues Trigger Created
**Function:** `calculate_cohost_dues_from_subclient_meeting()`
**Trigger:** `trigger_calculate_cohost_dues`

Automatically:
- Detects when screenshot uploaded for sub-client meeting
- Calculates cohost amount (admin_rate × member_count)
- Calculates subclient amount (their rate × member_count)
- Creates/updates daily_dues entries

## Database Changes Needed

Run this SQL in **Supabase SQL Editor**:

```sql
/*
  # Complete Co-host System Fix

  1. Fix advance_payments.client_id type (TEXT -> UUID)
  2. Add cohost dues calculation trigger
*/

-- Step 1: Fix advance_payments client_id type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'advance_payments'
    AND column_name = 'client_id'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE advance_payments
    ALTER COLUMN client_id TYPE uuid USING client_id::uuid;

    RAISE NOTICE 'Converted advance_payments.client_id from TEXT to UUID';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'advance_payments_client_id_fkey'
    AND table_name = 'advance_payments'
  ) THEN
    ALTER TABLE advance_payments
    ADD CONSTRAINT advance_payments_client_id_fkey
    FOREIGN KEY (client_id) REFERENCES users(id);

    RAISE NOTICE 'Added foreign key constraint advance_payments_client_id_fkey';
  END IF;
END $$;

-- Step 2: Create cohost dues calculation function
CREATE OR REPLACE FUNCTION calculate_cohost_dues_from_subclient_meeting()
RETURNS TRIGGER AS $$
DECLARE
  v_cohost_id uuid;
  v_admin_rate numeric;
  v_subclient_rate numeric;
  v_meeting_date date;
  v_cohost_amount numeric;
  v_subclient_amount numeric;
  v_cohost_name text;
  v_subclient_name text;
BEGIN
  -- Only process if screenshot is being uploaded/updated
  IF (TG_OP = 'UPDATE' AND OLD.screenshot_url IS DISTINCT FROM NEW.screenshot_url AND NEW.screenshot_url IS NOT NULL AND NEW.screenshot_url != '')
     OR (TG_OP = 'INSERT' AND NEW.screenshot_url IS NOT NULL AND NEW.screenshot_url != '') THEN

    -- Check if this meeting belongs to a cohost (has cohost_id)
    IF NEW.cohost_id IS NOT NULL THEN
      v_meeting_date := COALESCE(NEW.scheduled_date, NEW.created_at::date);

      -- Get cohost details and admin_rate
      SELECT id, name, admin_rate INTO v_cohost_id, v_cohost_name, v_admin_rate
      FROM users
      WHERE id = NEW.cohost_id;

      -- Get sub-client details and their rate
      SELECT name,
             CASE WHEN NEW.member_type = 'dp' THEN price_per_dp_member ELSE price_per_member END
      INTO v_subclient_name, v_subclient_rate
      FROM users
      WHERE id = NEW.client_id;

      -- Calculate amounts
      v_cohost_amount := NEW.member_count * COALESCE(v_admin_rate, 1);
      v_subclient_amount := NEW.member_count * COALESCE(v_subclient_rate, 1.1);

      -- Create/Update dues for cohost (cohost owes admin)
      INSERT INTO daily_dues (
        client_id,
        client_name,
        date,
        amount,
        original_amount,
        meeting_count,
        created_at
      ) VALUES (
        v_cohost_id,
        v_cohost_name,
        v_meeting_date,
        v_cohost_amount,
        v_cohost_amount,
        1,
        NOW()
      )
      ON CONFLICT (client_id, date)
      DO UPDATE SET
        amount = daily_dues.amount + v_cohost_amount,
        original_amount = daily_dues.original_amount + v_cohost_amount,
        meeting_count = daily_dues.meeting_count + 1;

      -- Create/Update dues for sub-client (sub-client owes cohost)
      INSERT INTO daily_dues (
        client_id,
        client_name,
        date,
        amount,
        original_amount,
        meeting_count,
        created_at
      ) VALUES (
        NEW.client_id,
        v_subclient_name,
        v_meeting_date,
        v_subclient_amount,
        v_subclient_amount,
        1,
        NOW()
      )
      ON CONFLICT (client_id, date)
      DO UPDATE SET
        amount = daily_dues.amount + v_subclient_amount,
        original_amount = daily_dues.original_amount + v_subclient_amount,
        meeting_count = daily_dues.meeting_count + 1;

    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_calculate_cohost_dues ON meetings;

-- Create trigger
CREATE TRIGGER trigger_calculate_cohost_dues
  AFTER INSERT OR UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_cohost_dues_from_subclient_meeting();
```

## How to Apply

### Option 1: Run SQL Directly in Supabase
1. Go to Supabase Dashboard → SQL Editor
2. Copy the SQL above
3. Click "Run"

### Option 2: Use Node Script (if you have SUPABASE_DB_URL)
```bash
node apply_cohost_dues_trigger.mjs
```

## Verification

After applying, test:

1. **Create sub-client under cohost:**
   - Cohost: Vijay
   - Sub-client: Raj (parent_user_id = Vijay's id)

2. **Sub-client creates meeting:**
   - Login as Raj
   - Schedule meeting with 50 members
   - Check: `cohost_id` should be set to Vijay's id

3. **Admin uploads screenshot:**
   - Login as admin
   - Upload screenshot for Raj's meeting
   - Check Vijay's panel: Should show Rs.50 in net dues
   - Check Raj's panel: Should show Rs.55 in net dues

4. **Co-host approves payment:**
   - Login as Vijay
   - Upload payment screenshot for Raj
   - Raj's dues should become 0
   - Vijay's dues remain until admin approves

## Tables Involved

### `users`
- `admin_rate` - Rate admin charges co-hosts per member (default: 1)
- `parent_user_id` - Points to co-host (for sub-clients)

### `meetings`
- `cohost_id` - Auto-set from parent_user_id when sub-client creates meeting

### `daily_dues`
- Stores dues for both co-hosts and sub-clients
- Automatically updated by trigger

## Notes

- Dues accumulate in "Net Due Today" and "Net Due Till Today"
- Remain until payment received/approved
- Co-host sees their own dues + can manage sub-client payments
- Admin sees co-host dues
- Sub-client sees their dues to co-host
