import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://fkypxitgnfqbfplxokve.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYyMTQ4OSwiZXhwIjoyMDc2MTk3NDg5fQ.xnWmC2U1gMfKjbzxYLvmXlgVAf5hfwC1U5s1iPKZ7jw';

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

console.log('🚀 Applying Co-Host system migration...\n');

const sql = readFileSync('./COHOST_MIGRATION.sql', 'utf-8');

const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

if (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
} else {
  console.log('✅ Co-Host system migration applied successfully!');
  console.log('\n📋 What was added:');
  console.log('   • is_cohost column in users table');
  console.log('   • parent_user_id column in users table');
  console.log('   • cohost_prefix column in users table');
  console.log('   • cohost_requests table');
  console.log('   • All necessary indexes and RLS policies');
  console.log('\n🎉 Co-Host system is now ready to use!');
}
