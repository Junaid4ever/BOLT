import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envFile = readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    env[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log('Applying constraint update...');
  
  const sql = `
    ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_status_check;
    ALTER TABLE meetings ADD CONSTRAINT meetings_status_check 
    CHECK (status IN ('active', 'not_live', 'cancelled', 'wrong_credentials'));
  `;
  
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  
  console.log('✅ Successfully added wrong_credentials status!');
}

run();
