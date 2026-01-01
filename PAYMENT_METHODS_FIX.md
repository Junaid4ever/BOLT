# Payment Methods Column Names Fix

## Problem:
When cohost tried to update payment methods (UPI, BEP20, TRC20), getting error:
```
Failed to update payment methods: Update failed: Could not find the 'bep20_address' column of 'payment_methods' in the schema cache
```

## Root Cause:
Code was using wrong column names:
- Used: `bep20_address` ❌
- Correct: `usdt_bep20_address` ✅
- Used: `trc20_address` ❌
- Correct: `usdt_trc20_address` ✅

## Actual Table Structure (payment_methods):
```sql
- id (uuid)
- upi_id (text)
- usdt_bep20_address (text)  -- Not 'bep20_address'
- usdt_trc20_address (text)  -- Not 'trc20_address'
- usdt_bep20_qr (text)
- usdt_trc20_qr (text)
- qr_code_url (text)
- cohost_user_id (uuid)
- created_at (timestamp)
- updated_at (timestamp)
```

## Fixed Files:
**CohostClientDashboard.tsx**

### 1. Fetch Payment Methods (Line 90-95):
```typescript
// Before:
setBep20Address(data.bep20_address || '');
setTrc20Address(data.trc20_address || '');

// After:
setBep20Address(data.usdt_bep20_address || '');
setTrc20Address(data.usdt_trc20_address || '');
```

### 2. Update Payment Methods (Line 250-259):
```typescript
// Before:
.update({
  upi_id: upiId,
  bep20_address: bep20Address,
  trc20_address: trc20Address,
  qr_code_url: qrUrl,
  updated_at: new Date().toISOString()
})

// After:
.update({
  upi_id: upiId,
  usdt_bep20_address: bep20Address,
  usdt_trc20_address: trc20Address,
  qr_code_url: qrUrl,
  updated_at: new Date().toISOString()
})
```

### 3. Insert Payment Methods (Line 267-275):
```typescript
// Before:
.insert({
  cohost_user_id: cohostUserId,
  upi_id: upiId,
  bep20_address: bep20Address,
  trc20_address: trc20Address,
  qr_code_url: qrUrl
})

// After:
.insert({
  cohost_user_id: cohostUserId,
  upi_id: upiId,
  usdt_bep20_address: bep20Address,
  usdt_trc20_address: trc20Address,
  qr_code_url: qrUrl
})
```

## Status: ✅ Fixed

Build successful! Payment methods update should work now.

## How to Test:
1. Login as cohost (Vinod)
2. Go to cohost dashboard
3. Click "Payment Settings"
4. Enter UPI ID, BEP20 address, TRC20 address
5. Upload QR code (optional)
6. Click "Save Payment Settings"
7. Should save successfully without errors
