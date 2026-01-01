import pg from 'pg';
import { readFileSync } from 'fs';
const { Client } = pg;

async function applyFix() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL
  });

  try {
    await client.connect();
    console.log('Connected to database...');

    const sql = readFileSync('./fix_client_id_type.sql', 'utf8');
    console.log('Applying fix...');

    await client.query(sql);

    console.log('✓ Fix applied successfully!');
    console.log('✓ advance_payments.client_id is now UUID type');
    console.log('✓ Screenshot upload should work now');
  } catch (error) {
    console.error('Error applying fix:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyFix();
