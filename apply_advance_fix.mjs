import pg from 'pg';
const { Client } = pg;

console.log('🔥 FIXING ADVANCE PAYMENT SYSTEM\n');

const connectionString = 'postgresql://postgres.fkypxitgnfqbfplxokve:Usman1122@@db.fkypxitgnfqbfplxokve.supabase.co:5432/postgres';

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const sql = `
/*
  # Fix Advance Payment - Store Manual Amount Only

  Problem: System automatically clears ALL past dues
  Solution: Store only the manually entered advance amount
*/

CREATE OR REPLACE FUNCTION public.apply_advance_simple(
  p_client_name text,
  p_advance_amount numeric,
  p_advance_date date,
  p_advance_id uuid,
  p_screenshot_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_remaining_advance NUMERIC;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM users WHERE name = p_client_name;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;

  -- Just store the advance amount as-is, don't touch past dues
  v_remaining_advance := p_advance_amount;

  -- Update advance payment record
  UPDATE advance_payments
  SET
    remaining_amount = v_remaining_advance,
    settlement_start_date = p_advance_date,
    is_active = TRUE,
    updated_at = NOW()
  WHERE id = p_advance_id;

  RETURN jsonb_build_object(
    'success', true,
    'advance_stored', p_advance_amount,
    'advance_start_date', p_advance_date,
    'message', 'Advance stored successfully. It will be used from this date onwards.'
  );

END;
$function$;
`;

try {
  console.log('Connecting to database...');
  await client.connect();
  console.log('✅ Connected!');

  console.log('Creating new advance function...');
  await client.query(sql);
  console.log('✅ Function created!');

  await client.end();

  console.log('\n' + '='.repeat(60));
  console.log('🎉 ADVANCE PAYMENT FIX COMPLETE!');
  console.log('='.repeat(60));
  console.log('\n✅ Now advance will only store the manual amount');
  console.log('✅ Past dues will not be auto-cleared\n');

} catch (error) {
  console.log('\n❌ Error:', error.message);
  try { await client.end(); } catch {}
}
