import pg from 'pg';
import { readFileSync } from 'fs';
const { Client } = pg;

async function applyTrigger() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    const sql = readFileSync('/tmp/complete_cohost_fix.sql', 'utf8');

    console.log('Applying complete cohost fix...');
    await client.query(sql);

    console.log('✓ Complete cohost system fixed!');
    console.log('\nWhat was fixed:');
    console.log('1. advance_payments.client_id type (TEXT -> UUID)');
    console.log('2. Screenshot upload error resolved');
    console.log('3. Cohost dues calculation trigger created');
    console.log('\nHow cohost dues work now:');
    console.log('• When admin uploads screenshot for sub-client meeting');
    console.log('• Creates dues for cohost (cohost owes admin at admin_rate)');
    console.log('• Creates dues for sub-client (sub-client owes cohost at their rate)');
    console.log('• Both appear in their respective panels with net dues');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyTrigger();
