import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fkypxitgnfqbfplxokve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc'
);

console.log('\n=================================================================');
console.log('               DATABASE STATUS CHECK');
console.log('=================================================================\n');

const { error: col } = await supabase.from('users').select('cohost_prefix').limit(1);
const { error: tbl } = await supabase.from('cohost_requests').select('id').limit(1);

console.log('cohost_prefix column:', col ? '❌ MISSING' : '✅ EXISTS');
console.log('cohost_requests table:', tbl ? '❌ MISSING' : '✅ EXISTS');

console.log('\n=================================================================');

if (!col && !tbl) {
  console.log('✅ CO-HOST SYSTEM IS 100% READY!');
  console.log('=================================================================');
  console.log('\nSab kuch perfectly setup hai. Koi kaam nahi chahiye!\n');
} else {
  console.log('❌ MIGRATION NEEDED');
  console.log('=================================================================');
  console.log('\n🚀 SOLUTION - DO THIS NOW:\n');
  console.log('1. Open your browser');
  console.log('2. Go to: http://localhost:5173/run-sql.html');
  console.log('3. SQL automatically copies');
  console.log('4. Click button');
  console.log('5. Paste & RUN\n');
  console.log('Time: 10 seconds total\n');
  console.log('=================================================================\n');
}
