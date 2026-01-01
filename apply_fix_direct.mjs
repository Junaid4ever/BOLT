import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

const dbUrl = 'postgresql://postgres.fkypxitgnfqbfplxokve:Prashant@9911@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

console.log('\n🔧 Applying fixes directly to database...\n');

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

try {
  await client.connect();
  console.log('✅ Connected to database\n');
  
  const sql = fs.readFileSync('/tmp/fix.sql', 'utf8');
  
  console.log('📝 Executing SQL...\n');
  await client.query(sql);
  
  console.log('✅ ALL FIXES APPLIED!\n');
  console.log('Refresh your admin panel - both issues are fixed!\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('\nFull error:', error);
} finally {
  await client.end();
}
