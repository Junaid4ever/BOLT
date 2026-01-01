import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fkypxitgnfqbfplxokve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc'
);

console.log('\n' + '='.repeat(70));
console.log('         INVESTIGATING SATURDAY BLOCKISTA BUG');
console.log('='.repeat(70) + '\n');

const { data: saturdayMeeting } = await supabase
  .from('meetings')
  .select('*')
  .ilike('meeting_name', '%blockista%')
  .eq('scheduled_date', '2025-12-20')
  .maybeSingle();

if (saturdayMeeting) {
  console.log('PROBLEM MEETING FOUND:');
  console.log('-'.repeat(70));
  console.log('Meeting:', saturdayMeeting.meeting_name);
  console.log('Date:', saturdayMeeting.scheduled_date, '(Saturday - Day 6)');
  console.log('Created At:', new Date(saturdayMeeting.created_at).toLocaleString());
  console.log('Is Recurring:', saturdayMeeting.is_recurring);
  console.log('Template ID:', saturdayMeeting.recurring_template_id);
  console.log('Status:', saturdayMeeting.status);
  
  if (saturdayMeeting.recurring_template_id) {
    const { data: template } = await supabase
      .from('recurring_meeting_templates')
      .select('*')
      .eq('id', saturdayMeeting.recurring_template_id)
      .maybeSingle();
    
    if (template) {
      console.log('\nTemplate Info:');
      console.log('  Name:', template.meeting_name);
      console.log('  Selected Days:', template.selected_days);
      console.log('  Day 6 (Saturday) in selected_days?:', template.selected_days.includes(6));
      console.log('  Created:', new Date(template.created_at).toLocaleString());
      console.log('  Last Modified:', new Date(template.updated_at).toLocaleString());
      
      console.log('\n❌ BUG CONFIRMED:');
      console.log('  Meeting was added on Saturday (day 6)');
      console.log('  But template selected_days is:', template.selected_days);
      console.log('  Saturday should have been SKIPPED!');
    }
  }
}

console.log('\n' + '='.repeat(70));
console.log('CHECKING ALL MEETINGS WITH WRONG SKIP DAYS:');
console.log('='.repeat(70) + '\n');

const { data: allActiveTemplates } = await supabase
  .from('recurring_meeting_templates')
  .select('*')
  .eq('is_active', true);

let totalWrong = 0;

for (const template of allActiveTemplates || []) {
  if (template.selected_days.length === 7) continue;
  
  const { data: meetings } = await supabase
    .from('meetings')
    .select('scheduled_date, status')
    .eq('recurring_template_id', template.id)
    .gte('scheduled_date', '2025-12-15');
  
  if (meetings && meetings.length > 0) {
    for (const m of meetings) {
      const date = new Date(m.scheduled_date + 'T00:00:00');
      const dayOfWeek = date.getDay();
      
      if (!template.selected_days.includes(dayOfWeek)) {
        console.log(`❌ ${template.client_name} - ${template.meeting_name}`);
        console.log(`   Date: ${m.scheduled_date} (Day ${dayOfWeek})`);
        console.log(`   Allowed days: ${template.selected_days}`);
        totalWrong++;
      }
    }
  }
}

console.log('\n' + '='.repeat(70));
console.log('TOTAL WRONG MEETINGS:', totalWrong);
console.log('='.repeat(70) + '\n');
