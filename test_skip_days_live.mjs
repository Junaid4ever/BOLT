import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fkypxitgnfqbfplxokve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc'
);

console.log('\n' + '='.repeat(70));
console.log('         LIVE TEST: SKIP DAYS WORKING?');
console.log('='.repeat(70) + '\n');

const today = new Date();
const dayOfWeek = today.getDay();
const todayStr = today.toISOString().split('T')[0];
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

console.log('Today:', dayNames[dayOfWeek], '(Day', dayOfWeek + ')');
console.log('Date:', todayStr);

console.log('\n' + '-'.repeat(70));
console.log('SIMULATING: Click "Fetch & Add Recurring" Button');
console.log('-'.repeat(70) + '\n');

const { data: templates } = await supabase
  .from('recurring_meeting_templates')
  .select('*')
  .eq('is_active', true);

const { data: existingMeetings } = await supabase
  .from('meetings')
  .select('meeting_id, member_count, client_name')
  .eq('scheduled_date', todayStr);

const existingMap = new Map();
existingMeetings?.forEach(m => {
  const key = `${m.client_name}-${m.meeting_id}-${m.member_count}`;
  existingMap.set(key, true);
});

let willAdd = [];
let willSkip = [];

for (const t of templates || []) {
  const selectedDays = t.selected_days || [0,1,2,3,4,5,6];
  const uniqueKey = `${t.client_name}-${t.meeting_id}-${t.member_count}`;
  
  if (!selectedDays.includes(dayOfWeek)) {
    willSkip.push({
      name: `${t.client_name} - ${t.meeting_name}`,
      reason: `Skip ${dayNames[dayOfWeek]}`
    });
  } else if (existingMap.has(uniqueKey)) {
    willSkip.push({
      name: `${t.client_name} - ${t.meeting_name}`,
      reason: 'Already added'
    });
  } else {
    willAdd.push(`${t.client_name} - ${t.meeting_name}`);
  }
}

console.log('Will ADD:', willAdd.length, 'meetings');
console.log('Will SKIP:', willSkip.length, 'meetings');

if (willSkip.length > 0) {
  console.log('\n📋 SKIPPED MEETINGS:');
  for (const item of willSkip) {
    console.log(`  ⛔ ${item.name} (${item.reason})`);
  }
}

const blockistaSkipped = willSkip.find(s => s.name.toLowerCase().includes('blockista'));

console.log('\n' + '='.repeat(70));
if (blockistaSkipped) {
  console.log('✅ BLOCKISTA CORRECTLY SKIPPED');
  console.log('Reason:', blockistaSkipped.reason);
} else {
  const blockistaAdded = willAdd.find(s => s.toLowerCase().includes('blockista'));
  if (blockistaAdded) {
    console.log('❌ BLOCKISTA WOULD BE ADDED (BUG!)');
  } else {
    console.log('ℹ️ No active Blockista template found');
  }
}
console.log('='.repeat(70) + '\n');
