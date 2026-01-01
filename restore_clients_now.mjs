import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreClients() {
  console.log('🚨 EMERGENCY CLIENT RESTORATION STARTING...\n');

  const sql = readFileSync('./EMERGENCY_RESTORE_CLIENTS.sql', 'utf-8');

  console.log('📋 Running restoration SQL...\n');

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  console.log('\n✅ CLIENTS RESTORED SUCCESSFULLY!');
  console.log('✅ Check your admin panel now - all clients should be visible');
}

restoreClients();
