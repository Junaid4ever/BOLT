import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fkypxitgnfqbfplxokve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc'
);

console.log('\n' + '='.repeat(70));
console.log('         BLOCKISTA - ALL RECENT MEETINGS');
console.log('='.repeat(70) + '\n');

const { data: blockistaMeetings } = await supabase
  .from('meetings')
  .select('*')
  .ilike('meeting_name', '%blockista%')
  .gte('scheduled_date', '2025-12-15')
  .order('scheduled_date', { ascending: false });

console.log('Blockista meetings since Dec 15:', (blockistaMeetings || []).length);

if (blockistaMeetings && blockistaMeetings.length > 0) {
  for (const m of blockistaMeetings) {
    const date = new Date(m.scheduled_date + 'T00:00:00');
    const dayOfWeek = date.getDay();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const shouldRun = [0, 2, 5].includes(dayOfWeek);
    const status = shouldRun ? '✅' : '❌';
    
    console.log(`${m.scheduled_date} (${dayNames[dayOfWeek]}) ${status}: ${m.meeting_name} - ${m.status}`);
  }
}

const { data: template } = await supabase
  .from('recurring_meeting_templates')
  .select('*')
  .ilike('meeting_name', '%blockista%')
  .maybeSingle();

if (template) {
  console.log('\n' + '='.repeat(70));
  console.log('TEMPLATE CONFIGURATION:');
  console.log('='.repeat(70));
  console.log('Selected Days:', template.selected_days);
  console.log('Should run on: Sunday (0), Tuesday (2), Friday (5)');
  console.log('Is Active:', template.is_active);
}

const today = new Date();
const dates = [];
for (let i = -3; i <= 3; i++) {
  const d = new Date(today);
  d.setDate(d.getDate() + i);
  dates.push(d.toISOString().split('T')[0]);
}

console.log('\n' + '='.repeat(70));
console.log('MEETINGS NEAR TODAY:');
console.log('='.repeat(70) + '\n');

for (const dateStr of dates) {
  const date = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = date.getDay();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const shouldRun = [0, 2, 5].includes(dayOfWeek);
  
  const { data: meetings } = await supabase
    .from('meetings')
    .select('meeting_name')
    .ilike('meeting_name', '%blockista%')
    .eq('scheduled_date', dateStr);
  
  const exists = meetings && meetings.length > 0;
  const status = shouldRun ? (exists ? '✅ YES' : '⚪ NO') : (exists ? '❌ BAD' : '✅ NO');
  
  console.log(`${dateStr} (${dayNames[dayOfWeek]}): ${status} ${shouldRun ? 'Should run' : 'Skip day'}`);
}

console.log('\n' + '='.repeat(70) + '\n');
