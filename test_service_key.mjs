import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fkypxitgnfqbfplxokve.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYyMTQ4OSwiZXhwIjoyMDc2MTk3NDg5fQ.xnWmC2U1gMfKjbzxYLvmXlgVAf5hfwC1U5s1iPKZ7jw';

console.log('Testing service role key...\n');

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test simple query
const { data, error } = await supabase
  .from('users')
  .select('id, name')
  .limit(1);

if (error) {
  console.log('❌ Service role key is INVALID or has issues');
  console.log('Error:', error.message);
  console.log('\n⚠️  Without a valid service role key, I cannot execute SQL automatically.');
  console.log('\n📋 The SQL MUST be run manually in Supabase Dashboard.');
  console.log('Dashboard: https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql');
} else {
  console.log('✅ Service role key works!');
  console.log('Found user:', data[0]?.name);
  console.log('\nNow trying to execute migrations...\n');

  // If service key works, try using query() method or raw SQL
  // Supabase JS client doesn't expose raw SQL execution for security
  console.log('⚠️  Supabase JS client doesn"t allow raw SQL execution');
  console.log('    This is a security feature by design.');
  console.log('\n📋 SQL must be executed via Supabase Dashboard:');
  console.log('    https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql');
}
