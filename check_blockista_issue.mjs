import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fkypxitgnfqbfplxokve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc'
);

const today = new Date();
const todayStr = today.toISOString().split('T')[0];
const dayOfWeek = today.getDay();
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

console.log('\n' + '='.repeat(70));
console.log('         BLOCKISTA SKIP DAY ISSUE');
console.log('='.repeat(70) + '\n');

console.log('Today:', dayNames[dayOfWeek], '(Day', dayOfWeek + ')');
console.log('Date:', todayStr);

const { data: blockistaTemplate } = await supabase
  .from('recurring_meeting_templates')
  .select('*')
  .ilike('meeting_name', '%blockista%')
  .maybeSingle();

if (blockistaTemplate) {
  console.log('\n' + '-'.repeat(70));
  console.log('BLOCKISTA TEMPLATE:');
  console.log('-'.repeat(70));
  console.log('Client:', blockistaTemplate.client_name);
  console.log('Is Active:', blockistaTemplate.is_active);
  console.log('Selected Days:', blockistaTemplate.selected_days);
  console.log('Type:', typeof blockistaTemplate.selected_days);
  console.log('Is Array:', Array.isArray(blockistaTemplate.selected_days));
  
  if (typeof blockistaTemplate.selected_days === 'string') {
    console.log('\nPARSING STRING:');
    try {
      const parsed = JSON.parse(blockistaTemplate.selected_days);
      console.log('Parsed:', parsed);
    } catch (e) {
      console.log('Parse error:', e.message);
      const split = blockistaTemplate.selected_days.split(',').map(s => parseInt(s.trim()));
      console.log('Split result:', split);
    }
  }
  
  const selectedDays = blockistaTemplate.selected_days;
  const shouldRunToday = selectedDays.includes(dayOfWeek);
  
  console.log('\nSHOULD RUN TODAY?');
  console.log('Day of week:', dayOfWeek, '(' + dayNames[dayOfWeek] + ')');
  console.log('Selected days:', selectedDays);
  console.log('Includes today?:', shouldRunToday);
  console.log('Expected: NO (Monday not in [0,2,5])');
  
  const { data: meetingsToday } = await supabase
    .from('meetings')
    .select('*')
    .ilike('meeting_name', '%blockista%')
    .eq('scheduled_date', todayStr);
  
  console.log('\n' + '-'.repeat(70));
  console.log('MEETINGS TODAY:');
  console.log('-'.repeat(70));
  console.log('Count:', (meetingsToday || []).length);
  
  if (meetingsToday && meetingsToday.length > 0) {
    for (const m of meetingsToday) {
      console.log('\nMeeting found:');
      console.log('  Name:', m.meeting_name);
      console.log('  Client:', m.client_name);
      console.log('  Status:', m.status);
      console.log('  Is Recurring:', m.is_recurring);
      console.log('  Template ID:', m.recurring_template_id);
      console.log('  Created At:', new Date(m.created_at).toLocaleString());
    }
  } else {
    console.log('No meetings found - CORRECT!');
  }
}

console.log('\n' + '='.repeat(70));
console.log('CHECKING ALL MEETINGS TODAY WITH SELECTED_DAYS CHECK:');
console.log('='.repeat(70) + '\n');

const { data: allActiveTemplates } = await supabase
  .from('recurring_meeting_templates')
  .select('*')
  .eq('is_active', true);

console.log('Active templates:', (allActiveTemplates || []).length);

if (allActiveTemplates) {
  for (const t of allActiveTemplates) {
    const selectedDays = t.selected_days || [0,1,2,3,4,5,6];
    const shouldRun = selectedDays.includes(dayOfWeek);
    const status = shouldRun ? 'SHOULD ADD' : 'SHOULD SKIP';
    console.log(`${t.client_name} - ${t.meeting_name}: ${status} (days: ${selectedDays})`);
  }
}

console.log('\n' + '='.repeat(70) + '\n');
