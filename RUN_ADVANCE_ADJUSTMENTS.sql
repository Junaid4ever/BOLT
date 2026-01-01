/*
  # Advance Payment Adjustment Tracking System

  This creates a system to track every adjustment made from advance payments
  with full meeting traceability.

  1. New Table: advance_adjustments
     - Tracks each individual adjustment against meetings
     - Stores meeting info for complete traceability

  2. Important Notes
     - Run this in your Supabase SQL Editor
     - This does NOT change existing billing logic
     - Only adds a tracking layer for advance adjustments
*/

-- Create advance_adjustments table for tracking each adjustment
CREATE TABLE IF NOT EXISTS advance_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advance_id uuid REFERENCES advance_payments(id) ON DELETE CASCADE,
  cohost_id uuid REFERENCES users(id),
  cohost_name text NOT NULL,
  subclient_id uuid REFERENCES users(id),
  subclient_name text,
  meeting_id text NOT NULL,
  meeting_name text,
  meeting_date date NOT NULL,
  member_count integer DEFAULT 0,
  adjusted_amount numeric(12,2) NOT NULL,
  balance_before numeric(12,2) NOT NULL,
  balance_after numeric(12,2) NOT NULL,
  is_subclient_meeting boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_advance_adjustments_advance_id ON advance_adjustments(advance_id);
CREATE INDEX IF NOT EXISTS idx_advance_adjustments_cohost_id ON advance_adjustments(cohost_id);
CREATE INDEX IF NOT EXISTS idx_advance_adjustments_subclient_id ON advance_adjustments(subclient_id);
CREATE INDEX IF NOT EXISTS idx_advance_adjustments_meeting_id ON advance_adjustments(meeting_id);
CREATE INDEX IF NOT EXISTS idx_advance_adjustments_meeting_date ON advance_adjustments(meeting_date);
CREATE INDEX IF NOT EXISTS idx_advance_adjustments_created_at ON advance_adjustments(created_at DESC);

-- Add advance_adjusted column to meetings if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meetings' AND column_name = 'advance_adjusted'
  ) THEN
    ALTER TABLE meetings ADD COLUMN advance_adjusted boolean DEFAULT false;
  END IF;
END $$;

-- Add advance_adjustment_amount to meetings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meetings' AND column_name = 'advance_adjustment_amount'
  ) THEN
    ALTER TABLE meetings ADD COLUMN advance_adjustment_amount numeric(12,2) DEFAULT 0;
  END IF;
END $$;

-- Enable realtime for advance_adjustments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'advance_adjustments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE advance_adjustments;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
