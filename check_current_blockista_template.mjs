import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fkypxitgnfqbfplxokve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc'
);

console.log('\n' + '='.repeat(70));
console.log('         CURRENT BLOCKISTA TEMPLATE STATUS');
console.log('='.repeat(70) + '\n');

const { data: template } = await supabase
  .from('recurring_meeting_templates')
  .select('*')
  .ilike('meeting_name', '%blockista%')
  .maybeSingle();

if (template) {
  console.log('Template Found:');
  console.log('  ID:', template.id);
  console.log('  Name:', template.meeting_name);
  console.log('  Client:', template.client_name);
  console.log('  Is Active:', template.is_active ? 'YES' : 'NO');
  console.log('  Selected Days:', template.selected_days);
  console.log('  Created:', new Date(template.created_at).toLocaleString());
  console.log('  Updated:', new Date(template.updated_at).toLocaleString());
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  console.log('\n  Should run on:');
  for (const day of template.selected_days) {
    console.log('    - ' + dayNames[day]);
  }
  
  console.log('\n  Should SKIP on:');
  for (let i = 0; i < 7; i++) {
    if (!template.selected_days.includes(i)) {
      console.log('    - ' + dayNames[i]);
    }
  }
} else {
  console.log('No Blockista template found');
}

console.log('\n' + '='.repeat(70));
console.log('TESTING FETCH LOGIC FOR TODAY (Monday):');
console.log('='.repeat(70) + '\n');

if (template && template.is_active) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const shouldAdd = template.selected_days.includes(dayOfWeek);
  
  console.log('Today is: Monday (Day 1)');
  console.log('Selected days:', template.selected_days);
  console.log('Includes Monday (1)?:', shouldAdd);
  console.log('Result:', shouldAdd ? '✅ WILL ADD' : '⛔ WILL SKIP');
} else {
  console.log('Template is inactive - will not be added regardless');
}

console.log('\n' + '='.repeat(70));
console.log('SIMULATING FETCH BUTTON CLICK:');
console.log('='.repeat(70) + '\n');

const dayOfWeek = new Date().getDay();
const selectedDateStr = new Date().toISOString().split('T')[0];

const { data: activeTemplates } = await supabase
  .from('recurring_meeting_templates')
  .select('*')
  .eq('is_active', true);

console.log('Active templates:', (activeTemplates || []).length);

if (activeTemplates) {
  for (const t of activeTemplates) {
    const selectedDays = t.selected_days || [0,1,2,3,4,5,6];
    const shouldAdd = selectedDays.includes(dayOfWeek);
    
    if (t.meeting_name.toLowerCase().includes('blockista')) {
      console.log('\n⭐ BLOCKISTA:');
      console.log('   Will be added?', shouldAdd ? 'YES ❌ BUG!' : 'NO ✅ CORRECT!');
      console.log('   Reason:', shouldAdd ? 'Monday is in selected_days' : 'Monday not in selected_days [0,2,5]');
    }
  }
}

console.log('\n' + '='.repeat(70) + '\n');
