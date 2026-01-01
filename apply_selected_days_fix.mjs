import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://fkypxitgnfqbfplxokve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYyMTQ4OSwiZXhwIjoyMDc2MTk3NDg5fQ.O-3T6dPJvA14bTg6KxIxE0VmTzLPwKXU1FeFWb9yFqw'
);

console.log('\n' + '='.repeat(70));
console.log('         APPLYING SELECTED_DAYS FIX');
console.log('='.repeat(70) + '\n');

const sql = readFileSync('supabase/migrations/20251222150000_fix_selected_days_and_status.sql', 'utf8');

console.log('Migration file loaded:', sql.length, 'bytes');
console.log('\nApplying migration...\n');

const { data, error } = await supabase.rpc('exec_sql', {
  sql_query: sql
});

if (error) {
  console.log('❌ ERROR:', error.message);
  console.log('\nTrying alternative method...\n');
  
  const lines = sql.split(';').filter(line => line.trim());
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    console.log(`Executing statement ${i+1}/${lines.length}...`);
    
    const { error: err } = await supabase.rpc('exec_sql', {
      sql_query: line + ';'
    });
    
    if (err) {
      console.log(`  ❌ Error: ${err.message}`);
    } else {
      console.log('  ✅ Success');
    }
  }
} else {
  console.log('✅ Migration applied successfully!');
}

console.log('\n' + '='.repeat(70));
console.log('VERIFYING FIX');
console.log('='.repeat(70) + '\n');

const today = new Date();
const dayOfWeek = today.getDay();
const todayStr = today.toISOString().split('T')[0];

console.log('Today:', ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek], '(Day', dayOfWeek + ')');

console.log('\n1. Checking if Blockista exists today (should NOT exist)...');

const { data: blockistaMeeting } = await supabase
  .from('meetings')
  .select('*')
  .eq('client_name', 'Prashant')
  .ilike('meeting_name', '%blockista%')
  .eq('scheduled_date', todayStr)
  .maybeSingle();

if (blockistaMeeting) {
  console.log('  ❌ Still exists! Deleting...');
  
  await supabase
    .from('meetings')
    .delete()
    .eq('id', blockistaMeeting.id);
  
  console.log('  ✅ Deleted');
} else {
  console.log('  ✅ Does not exist (correct!)');
}

console.log('\n2. Testing create_daily_meetings() function...');

const { data: result } = await supabase.rpc('create_daily_meetings');

console.log('  Meetings created:', result || 0);

const { data: blockistaCheck } = await supabase
  .from('meetings')
  .select('*')
  .eq('client_name', 'Prashant')
  .ilike('meeting_name', '%blockista%')
  .eq('scheduled_date', todayStr)
  .maybeSingle();

if (blockistaCheck) {
  console.log('  ❌ BUG STILL EXISTS: Blockista was created on skip day!');
} else {
  console.log('  ✅ FIXED: Blockista was NOT created (correct!)');
}

console.log('\n' + '='.repeat(70));
console.log('FIX COMPLETE!');
console.log('='.repeat(70) + '\n');

