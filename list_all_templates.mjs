import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fkypxitgnfqbfplxokve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc'
);

console.log('\n' + '='.repeat(70));
console.log('         ALL ACTIVE TEMPLATES');
console.log('='.repeat(70) + '\n');

const { data: templates } = await supabase
  .from('recurring_meeting_templates')
  .select('*')
  .eq('is_active', true)
  .order('client_name');

console.log('Total:', (templates || []).length);

const today = new Date().getDay();
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

console.log('Today: Monday (Day 1)\n');

for (const t of templates || []) {
  const selectedDays = t.selected_days || [0,1,2,3,4,5,6];
  const shouldRun = selectedDays.includes(today);
  const allDays = selectedDays.length === 7;
  const status = shouldRun ? '✅' : '⛔';
  
  if (!allDays || t.meeting_name.toLowerCase().includes('blockista')) {
    console.log(`${status} ${t.client_name} - ${t.meeting_name}`);
    console.log(`   Days: ${selectedDays.map(d => dayNames[d]).join(', ')}`);
  }
}

console.log('\n' + '='.repeat(70) + '\n');
