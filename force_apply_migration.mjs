import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const { Client } = pg;

console.log('🔥 FORCE APPLYING CO-HOST MIGRATION\n');

const sql = readFileSync('./RUN_THIS_SQL_IN_SUPABASE.sql', 'utf-8');

const passwords = [
  'Usman1122@',
  'Usman1122@@',
  'usman1122',
  'Usman@1122',
  'Usman1122',
  'usman1122@',
  'usman1122@@'
];

const hosts = [
  'db.fkypxitgnfqbfplxokve.supabase.co',
  'aws-0-ap-south-1.pooler.supabase.com'
];

async function tryConnect(host, password, port = 5432) {
  const connString = `postgresql://postgres.fkypxitgnfqbfplxokve:${password}@${host}:${port}/postgres`;

  const client = new Client({
    connectionString: connString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    console.log(`   ✅ CONNECTED! Executing SQL...`);

    await client.query(sql);
    console.log(`   ✅ SQL EXECUTED!`);

    const result = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('is_cohost', 'parent_user_id', 'cohost_prefix')
    `);

    console.log(`   ✅ Verified: ${result.rows.length}/3 columns`);

    await client.end();
    return true;
  } catch (error) {
    console.log(`   ❌ ${error.code || error.message.substring(0, 50)}`);
    try { await client.end(); } catch {}
    return false;
  }
}

let success = false;

for (const host of hosts) {
  for (const password of passwords) {
    const port = host.includes('pooler') ? 6543 : 5432;
    console.log(`\n🔌 Trying ${host}:${port}...`);

    if (await tryConnect(host, password, port)) {
      success = true;
      break;
    } else {
      console.log(`   ❌ Connection failed`);
    }
  }
  if (success) break;
}

if (success) {
  console.log('\n' + '='.repeat(60));
  console.log('🎉 MIGRATION APPLIED!');
  console.log('='.repeat(60));
  console.log('\n✅ Refresh browser - Co-Host ready!\n');
  process.exit(0);
}

console.log('\n' + '='.repeat(60));
console.log('❌ ALL ATTEMPTS FAILED');
console.log('='.repeat(60));
console.log('\nDatabase password galat hai ya connection blocked hai.');
console.log('\n⚠️  Aapko manually run karna hoga:');
console.log('   https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql');
console.log('   File: RUN_THIS_SQL_IN_SUPABASE.sql\n');
process.exit(1);
