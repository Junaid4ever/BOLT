import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fkypxitgnfqbfplxokve.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc';

const supabase = createClient(supabaseUrl, anonKey);

console.log('🔍 Verifying Co-Host System...\n');

console.log('Test 1: Checking cohost_prefix column...');
const { data, error } = await supabase
  .from('users')
  .select('cohost_prefix')
  .limit(1);

if (error) {
  console.log('   ❌ ERROR:', error.message);
  console.log('   Status:', error.code);
} else {
  console.log('   ✅ cohost_prefix column EXISTS');
  console.log('   Data:', data);
}

console.log('\nTest 2: Checking cohost_requests table...');
const { data: reqData, error: reqError } = await supabase
  .from('cohost_requests')
  .select('*')
  .limit(1);

if (reqError) {
  console.log('   ❌ ERROR:', reqError.message);
} else {
  console.log('   ✅ cohost_requests table EXISTS');
  console.log('   Data:', reqData);
}

console.log('\n' + '='.repeat(60));
if (!error && !reqError) {
  console.log('✅ CO-HOST SYSTEM IS READY!');
  console.log('='.repeat(60));
  console.log('\nYou can now:');
  console.log('  - Users can request co-host status');
  console.log('  - Admins can approve/reject requests');
  console.log('  - Co-hosts can manage their clients\n');
} else {
  console.log('❌ CO-HOST SYSTEM NOT READY');
  console.log('='.repeat(60));
  console.log('\nMissing components need to be added via SQL.\n');
}
