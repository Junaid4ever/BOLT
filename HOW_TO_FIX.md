# Meeting Insert Fix - Quick Guide

## Problem
Two issues preventing meeting creation:
1. Status constraint only allows old values: 'active', 'not_live', 'cancelled'
2. Triggers reference non-existent column `dp_member_price`

## Solution
Run the SQL in `URGENT_FIX_NOW.sql` or use the HTML helper.

## Option 1: Using HTML Helper (Easiest)
1. Open browser: `http://localhost:5173/FIX_EVERYTHING_NOW.html`
2. Click "Copy & Open Supabase"
3. Paste and run in Supabase SQL Editor

## Option 2: Direct SQL
Copy content from `URGENT_FIX_NOW.sql` and run in Supabase

## What It Fixes
1. Updates status constraint to allow: scheduled, active, completed, cancelled, attended, missed, not_live
2. Creates wrapper functions for triggers (PostgreSQL syntax requirement)
3. Drops and recreates all meeting triggers correctly
4. Tests the fix automatically

## After Running
You should see: `✅ SUCCESS: ID <uuid>`

Then meetings will save without errors.
