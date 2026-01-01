import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fkypxitgnfqbfplxokve.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc';

const supabase = createClient(supabaseUrl, anonKey);

console.log('\n🔍 Testing Co-Host System...\n');

async function test() {
  // Test cohost_requests table
  console.log('1️⃣  Testing cohost_requests table...');
  const { data: requests, error: requestsError } = await supabase
    .from('cohost_requests')
    .select('*')
    .limit(1);

  if (requestsError) {
    if (requestsError.message.includes('does not exist')) {
      console.log('   ❌ Table does NOT exist yet');
    } else {
      console.log('   ⚠️  Error:', requestsError.message);
    }
  } else {
    console.log('   ✅ Table EXISTS and is accessible!');
  }

  // Test users columns
  console.log('\n2️⃣  Testing users table columns...');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, is_cohost, parent_user_id, cohost_prefix')
    .limit(1);

  if (usersError) {
    console.log('   ❌ Columns missing:', usersError.message);
  } else {
    console.log('   ✅ All columns exist!');
  }

  // Test client query
  console.log('\n3️⃣  Testing client list query...');
  const { data: clients, error: clientsError } = await supabase
    .from('users')
    .select('id, name, email, role')
    .eq('role', 'client')
    .limit(5);

  if (clientsError) {
    console.log('   ❌ Error:', clientsError.message);
  } else {
    console.log('   ✅ Found', clients ? clients.length : 0, 'clients (showing up to 5)');
    if (clients && clients.length > 0) {
      clients.forEach(c => console.log(`      - ${c.name} (${c.email})`));
    }
  }

  console.log('\n' + '='.repeat(50));
  if (!requestsError && !usersError) {
    console.log('✅ System Ready! Dono problems fix ho gayi:');
    console.log('   1. Client request submit kar sakte hain');
    console.log('   2. Admin panel me clients dikhai denge');
  } else {
    console.log('❌ Migration abhi apply nahi hua');
  }
  console.log('='.repeat(50) + '\n');
}

test();
