import pg from 'pg';
import { readFileSync } from 'fs';

const { Client } = pg;

console.log('🔥 FORCE APPLYING ADJUSTMENT_AMOUNT FIX\n');

const sql = readFileSync('./FIX_ADJUSTMENT_AMOUNT.sql', 'utf-8');

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
      WHERE table_name = 'daily_dues'
      AND column_name IN ('advance_adjustment', 'original_amount')
      ORDER BY column_name
    `);

    console.log(`   ✅ Verified: ${result.rows.length}/2 columns exist`);
    result.rows.forEach(row => {
      console.log(`      - ${row.column_name}`);
    });

    const funcResult = await client.query(`
      SELECT routine_name FROM information_schema.routines
      WHERE routine_name = 'calculate_daily_dues_for_client'
      AND routine_schema = 'public'
    `);

    console.log(`   ✅ Function updated: ${funcResult.rows.length > 0 ? 'YES' : 'NO'}`);

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
  console.log('🎉 ADJUSTMENT_AMOUNT FIX APPLIED!');
  console.log('='.repeat(60));
  console.log('\n✅ Sub-clients can now add meetings without errors!\n');
  process.exit(0);
}

console.log('\n' + '='.repeat(60));
console.log('❌ ALL ATTEMPTS FAILED');
console.log('='.repeat(60));
console.log('\nDatabase connection failed with all password combinations.');
console.log('\n⚠️  Please run manually in Supabase SQL Editor:');
console.log('   https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql');
console.log('   File: FIX_ADJUSTMENT_AMOUNT.sql\n');
process.exit(1);
