import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fkypxitgnfqbfplxokve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc'
);

const today = new Date().toISOString().split('T')[0];

console.log('\n' + '='.repeat(70));
console.log('         CHECKING BLOCKISTA MEETINGS TODAY');
console.log('='.repeat(70) + '\n');

console.log('Date:', today, '(Monday)');

const { data: blockistaMeetings } = await supabase
  .from('meetings')
  .select('*')
  .ilike('meeting_name', '%blockista%')
  .eq('scheduled_date', today);

console.log('\nBlockista meetings found:', (blockistaMeetings || []).length);

if (blockistaMeetings && blockistaMeetings.length > 0) {
  for (const m of blockistaMeetings) {
    console.log('\n' + '-'.repeat(70));
    console.log('PROBLEM MEETING FOUND!');
    console.log('-'.repeat(70));
    console.log('Meeting Name:', m.meeting_name);
    console.log('Client:', m.client_name);
    console.log('Status:', m.status);
    console.log('Is Recurring:', m.is_recurring);
    console.log('Template ID:', m.recurring_template_id);
    console.log('Created At:', new Date(m.created_at).toLocaleString());
    console.log('Scheduled Date:', m.scheduled_date);
    
    if (m.recurring_template_id) {
      const { data: template } = await supabase
        .from('recurring_meeting_templates')
        .select('*')
        .eq('id', m.recurring_template_id)
        .maybeSingle();
      
      if (template) {
        console.log('\nTemplate Info:');
        console.log('  Selected Days:', template.selected_days);
        console.log('  Is Active:', template.is_active);
        console.log('  Monday (day 1) included?:', template.selected_days.includes(1));
      }
    }
  }
} else {
  console.log('\nNo Blockista meetings found today - CORRECT!');
}

const { data: prashantMeetings } = await supabase
  .from('meetings')
  .select('meeting_name, status, is_recurring')
  .eq('client_name', 'Prashant')
  .eq('scheduled_date', today);

console.log('\n' + '='.repeat(70));
console.log('ALL PRASHANT MEETINGS TODAY:');
console.log('='.repeat(70) + '\n');

console.log('Total:', (prashantMeetings || []).length);

if (prashantMeetings && prashantMeetings.length > 0) {
  for (const m of prashantMeetings) {
    console.log('  - ' + m.meeting_name + ' (Status: ' + m.status + ')');
  }
}

console.log('\n' + '='.repeat(70) + '\n');
