import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fkypxitgnfqbfplxokve.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYyMTQ4OSwiZXhwIjoyMDc2MTk3NDg5fQ.xnWmC2U1gMfKjbzxYLvmXlgVAf5hfwC1U5s1iPKZ7jw';

const supabase = createClient(supabaseUrl, serviceKey);

console.log('🔍 COMPREHENSIVE DATABASE CHECK\n');
console.log('='.repeat(60));

console.log('\n1. Checking users table columns...');
const { data: users, error: usersError } = await supabase
  .from('users')
  .select('*')
  .limit(1);

if (users && users.length > 0) {
  const user = users[0];
  const hasIsCohost = 'is_cohost' in user;
  const hasParentId = 'parent_user_id' in user;
  const hasPrefix = 'cohost_prefix' in user;

  console.log('   is_cohost:', hasIsCohost ? '✅ EXISTS' : '❌ MISSING');
  console.log('   parent_user_id:', hasParentId ? '✅ EXISTS' : '❌ MISSING');
  console.log('   cohost_prefix:', hasPrefix ? '✅ EXISTS' : '❌ MISSING');

  if (hasIsCohost && hasParentId && hasPrefix) {
    console.log('\n✅ All user columns present!');
  } else {
    console.log('\n❌ Missing columns need to be added');
  }
} else {
  console.log('   ❌ Could not fetch user data');
}

console.log('\n2. Checking cohost_requests table...');
const { data: requests, error: requestsError } = await supabase
  .from('cohost_requests')
  .select('*')
  .limit(1);

if (requestsError) {
  if (requestsError.message.includes('does not exist')) {
    console.log('   ❌ MISSING - Table does not exist');
  } else {
    console.log('   ❌ Error:', requestsError.message);
  }
} else {
  console.log('   ✅ EXISTS - Table is ready');
  console.log('   Rows:', requests.length);
}

console.log('\n' + '='.repeat(60));

const allGood = users && 
                'cohost_prefix' in users[0] && 
                !requestsError;

if (allGood) {
  console.log('🎉 CO-HOST SYSTEM IS READY!');
  console.log('='.repeat(60));
  console.log('\nAll required database objects exist.');
  console.log('You can start using the Co-Host features now.\n');
  process.exit(0);
} else {
  console.log('❌ CO-HOST SYSTEM NOT READY');
  console.log('='.repeat(60));
  console.log('\n📋 REQUIRED ACTION:');
  console.log('\nOption 1 (EASIEST - 10 seconds):');
  console.log('  1. Open: http://localhost:5173/run-sql.html');
  console.log('  2. SQL auto-copies to clipboard');
  console.log('  3. Click button to open Supabase');
  console.log('  4. Paste (Ctrl+V) and click RUN');
  console.log('  5. Done!');
  console.log('\nOption 2 (Direct):');
  console.log('  1. Open: https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql');
  console.log('  2. Copy SQL from: RUN_THIS_SQL_IN_SUPABASE.sql');
  console.log('  3. Paste and click RUN');
  console.log('\nOption 3 (Auto-attempt):');
  console.log('  Open: http://localhost:5173/fix-cohost-now.html');
  console.log('  (Will try auto-execution, fallback to manual)\n');
  console.log('='.repeat(60) + '\n');
  process.exit(1);
}
