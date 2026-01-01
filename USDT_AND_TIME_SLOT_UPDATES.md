# USDT Rate and Time Slot Updates - Dec 19, 2024

## Summary of Changes

### 1. USDT Rate Management
- Added `usdt_rate` field to users table (default 90 INR per USDT)
- Added UI in ClientsOverview to edit USDT rate per client
- Payment receiving now shows USDT estimate based on client's rate

### 2. Time Slot Rounding Fixed
- Time slots now correctly show: 15, 30, 45, 60 minutes
- Slot ranges:
  - **15 min slot**: 0-15 minutes
  - **30 min slot**: 16-30 minutes  
  - **45 min slot**: 31-45 minutes
  - **60 min slot**: 46-60 minutes

### 3. Duplicate Meeting Prevention
- Added status filtering to prevent duplicate meetings
- Console logging for debugging duplicate issues

## Required SQL Migration

**IMPORTANT**: You need to run these SQL commands in Supabase SQL Editor:

### 1. Add USDT Rate Column
```sql
-- Add USDT rate column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS usdt_rate INTEGER DEFAULT 90;

-- Update existing users to have default rate
UPDATE users 
SET usdt_rate = 90 
WHERE usdt_rate IS NULL;
```

### 2. Prevent Duplicate Meetings (Optional but Recommended)
```sql
-- Add unique constraint to prevent duplicate meetings
-- Same client cannot add same meeting_id on same scheduled_date for active meetings
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_client_meeting_date
ON meetings (client_name, meeting_id, scheduled_date)
WHERE status != 'deleted';
```

## How to Apply SQL

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql
2. Copy the SQL from above
3. Paste into SQL Editor
4. Click "Run"

## Features Added

### In Admin Panel (ClientsOverview):
- New "USDT Conversion Rate" button in rate adjustment modal
- Shows current rate (default 90 INR/USDT)
- Can be customized per client

### In Payment Receiving:
- USDT estimate shown below payment amount
- Formula: Payment Amount ÷ USDT Rate
- Example: ₹9,000 ÷ 90 = ~100 USDT

### In Meeting List:
- Time slot buttons now show correct ranges
- Meetings grouped properly by minute ranges
- Clear labels (e.g., ":60 min (46-60 min)")

## Testing Checklist

- [ ] Run SQL migrations in Supabase
- [ ] Test USDT rate editing in ClientsOverview
- [ ] Verify USDT estimate shows in payment receiving
- [ ] Check time slot filtering works correctly (15, 30, 45, 60)
- [ ] Test duplicate meeting prevention

