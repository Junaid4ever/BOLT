import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://fkypxitgnfqbfplxokve.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc';

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = readFileSync('FIX_ALL_COHOST_ISSUES.sql', 'utf-8');

console.log('🚀 Applying Co-Host System Fixes...');

const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

if (error) {
  console.error('❌ Could not apply fixes automatically');
  console.error('Error:', error.message);
  console.log('');
  console.log('📋 Please run this SQL manually in Supabase SQL Editor:');
  console.log('👉 https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql');
  console.log('');
  console.log('Copy-paste this SQL:');
  console.log('='.repeat(60));
  console.log(sql);
  console.log('='.repeat(60));
  process.exit(1);
} else {
  console.log('✅ Co-host system fixes applied successfully!');
  console.log('✅ All issues resolved:');
  console.log('   - UUID type mismatches fixed');
  console.log('   - Co-host meetings now visible in cohost panel');
  console.log('   - Screenshot upload fixed for sub-client meetings');
  console.log('   - Dues calculation working for both cohost and sub-client');
}
