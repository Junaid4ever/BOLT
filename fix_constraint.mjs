import { readFileSync } from 'fs';

const envFile = readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    env[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

console.log('Database URL:', supabaseUrl);
console.log('Using direct SQL execution...\n');

const sql = `ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_status_check; ALTER TABLE meetings ADD CONSTRAINT meetings_status_check CHECK (status IN ('active', 'not_live', 'cancelled', 'wrong_credentials'));`;

const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ sql_query: sql })
});

const result = await response.json();

if (response.ok) {
  console.log('✅ Success! Wrong credentials status has been added to the database.');
  console.log('\nClients will now see "WRONG CREDS" badge when admin marks a meeting.');
} else {
  console.error('❌ Error:', result);
  
  if (result.code === 'PGRST202') {
    console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:');
    console.log('\nALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_status_check;');
    console.log("ALTER TABLE meetings ADD CONSTRAINT meetings_status_check CHECK (status IN ('active', 'not_live', 'cancelled', 'wrong_credentials'));");
  }
}
