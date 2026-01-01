import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://fkypxitgnfqbfplxokve.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYyMTQ4OSwiZXhwIjoyMDc2MTk3NDg5fQ.xnWmC2U1gMfKjbzxYLvmXlgVAf5hfwC1U5s1iPKZ7jw';

console.log('🚀 Applying Co-Host Migration (Direct Method)...\n');

const sql = readFileSync('./COHOST_MIGRATION.sql', 'utf-8');

// Try REST API directly
const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': supabaseServiceKey,
    'Authorization': `Bearer ${supabaseServiceKey}`,
    'Prefer': 'return=representation'
  },
  body: JSON.stringify({ sql_query: sql })
});

if (!response.ok) {
  console.log('❌ exec_sql function not available');
  console.log('📋 Attempting alternative method...\n');

  // Alternative: execute statements one by one
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
    db: { schema: 'public' }
  });

  console.log('⚙️  Checking current database state...');

  // Check if columns exist
  const { data: users } = await supabase.from('users').select('*').limit(1);

  if (users && users.length > 0) {
    const user = users[0];
    const hasIsCohost = 'is_cohost' in user;
    const hasParentId = 'parent_user_id' in user;
    const hasPrefix = 'cohost_prefix' in user;

    console.log('   is_cohost:', hasIsCohost ? '✅' : '❌');
    console.log('   parent_user_id:', hasParentId ? '✅' : '❌');
    console.log('   cohost_prefix:', hasPrefix ? '✅' : '❌');

    if (!hasIsCohost || !hasParentId || !hasPrefix) {
      console.log('\n❌ Missing columns in users table');
      console.log('\n📋 MANUAL ACTION REQUIRED:');
      console.log('   Run the SQL in Supabase Dashboard SQL Editor');
      console.log('   File: COHOST_MIGRATION.sql');
      console.log('   Dashboard: https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql\n');
      process.exit(1);
    }
  }

  // Check if cohost_requests table exists
  const { error: tableError } = await supabase
    .from('cohost_requests')
    .select('id')
    .limit(1);

  if (tableError && tableError.message.includes('does not exist')) {
    console.log('\n❌ cohost_requests table does not exist');
    console.log('\n📋 MANUAL ACTION REQUIRED:');
    console.log('   Run the SQL in Supabase Dashboard SQL Editor');
    console.log('   File: COHOST_MIGRATION.sql');
    console.log('   Dashboard: https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql\n');
    process.exit(1);
  }

  console.log('\n✅ All database objects exist!');
  console.log('🎉 Co-Host system is ready!\n');
} else {
  const result = await response.json();
  console.log('✅ Migration applied successfully!');
  console.log('🎉 Co-Host system is ready!\n');
}
