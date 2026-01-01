/*
  # Fix client_id Type Mismatch in advance_payments

  1. Problem
    - advance_payments.client_id is TEXT but users.id is UUID
    - Triggers comparing them cause "operator does not exist: text = uuid" error

  2. Solution
    - Convert client_id from TEXT to UUID
    - Add proper foreign key constraint
*/

-- First, update any existing text values to ensure they're valid UUIDs
-- (In case there are any invalid values, they'll be caught here)
DO $$
BEGIN
  -- Check if we need to convert the column
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'advance_payments'
    AND column_name = 'client_id'
    AND data_type = 'text'
  ) THEN
    -- Convert the column type from text to uuid
    ALTER TABLE advance_payments
    ALTER COLUMN client_id TYPE uuid USING client_id::uuid;

    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_name = 'advance_payments_client_id_fkey'
    ) THEN
      ALTER TABLE advance_payments
      ADD CONSTRAINT advance_payments_client_id_fkey
      FOREIGN KEY (client_id) REFERENCES users(id);
    END IF;

    RAISE NOTICE 'Successfully converted advance_payments.client_id from text to uuid';
  ELSE
    RAISE NOTICE 'advance_payments.client_id is already uuid type';
  END IF;
END $$;
