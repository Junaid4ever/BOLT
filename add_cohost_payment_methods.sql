-- Add Co-host Support to Payment Methods
-- Add cohost_user_id column to payment_methods
ALTER TABLE payment_methods
ADD COLUMN IF NOT EXISTS cohost_user_id uuid REFERENCES users(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_methods_cohost_user_id
ON payment_methods(cohost_user_id);

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Authenticated users can update payment methods" ON payment_methods;

-- Allow everyone to read admin payment methods (cohost_user_id IS NULL)
CREATE POLICY "Anyone can read admin payment methods"
  ON payment_methods
  FOR SELECT
  USING (cohost_user_id IS NULL);

-- Allow users to read their parent cohost's payment methods
CREATE POLICY "Users can read their cohost payment methods"
  ON payment_methods
  FOR SELECT
  USING (
    cohost_user_id IN (
      SELECT parent_user_id FROM users WHERE id = auth.uid()
    )
  );

-- Allow cohosts to read their own payment methods
CREATE POLICY "Cohosts can read own payment methods"
  ON payment_methods
  FOR SELECT
  USING (cohost_user_id = auth.uid());

-- Allow cohosts to insert their own payment methods
CREATE POLICY "Cohosts can insert own payment methods"
  ON payment_methods
  FOR INSERT
  WITH CHECK (cohost_user_id = auth.uid());

-- Allow cohosts to update their own payment methods
CREATE POLICY "Cohosts can update own payment methods"
  ON payment_methods
  FOR UPDATE
  USING (cohost_user_id = auth.uid())
  WITH CHECK (cohost_user_id = auth.uid());

-- Allow admin to manage all payment methods
CREATE POLICY "Admin can manage all payment methods"
  ON payment_methods
  FOR ALL
  USING (true)
  WITH CHECK (true);
