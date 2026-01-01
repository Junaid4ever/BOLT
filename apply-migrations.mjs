import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://fkypxitgnfqbfplxokve.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc';

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = readFileSync('/tmp/apply_features.sql', 'utf-8');

console.log('Applying migrations...');
console.log('Note: This uses anon key which may not have DDL permissions.');
console.log('If this fails, you need to run the SQL manually in Supabase dashboard.');
console.log('');

// Try to execute - this will likely fail with anon key but we'll provide instructions
const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

if (error) {
  console.error('❌ Could not apply migrations automatically (expected with anon key)');
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
  console.log('✅ Migrations applied successfully!');
}
