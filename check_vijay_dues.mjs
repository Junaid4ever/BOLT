import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fkypxitgnfqbfplxokve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc'
);

console.log('\n=== CHECKING RECURRING TEMPLATES ===\n');

// 1. Check Vinod's client_id
const { data: vinod } = await supabase
  .from('users')
  .select('id, name')
  .eq('name', 'Vinod')
  .single();

if (vinod) {
  console.log(`✅ Vinod found: ${vinod.id}\n`);

  // 2. Check Vinod's recurring templates
  const { data: vinodTemplates } = await supabase
    .from('recurring_meeting_templates')
    .select('*')
    .eq('client_id', vinod.id);

  console.log(`Vinod's recurring templates: ${vinodTemplates?.length || 0}`);
  if (vinodTemplates && vinodTemplates.length > 0) {
    vinodTemplates.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.meeting_name} - ${t.member_count} ${t.member_type} at ${t.hour}:${String(t.minutes).padStart(2, '0')} ${t.time_period}`);
    });
  }
} else {
  console.log('❌ Vinod not found\n');
}

// 3. Check ALL recurring templates
console.log('\n=== ALL RECURRING TEMPLATES ===\n');
const { data: allTemplates } = await supabase
  .from('recurring_meeting_templates')
  .select('*');

console.log(`Total templates in database: ${allTemplates?.length || 0}\n`);

if (allTemplates && allTemplates.length > 0) {
  const byClient = {};
  allTemplates.forEach(t => {
    if (!byClient[t.client_name]) {
      byClient[t.client_name] = [];
    }
    byClient[t.client_name].push(t);
  });

  Object.keys(byClient).forEach(clientName => {
    console.log(`${clientName}: ${byClient[clientName].length} meetings`);
    byClient[clientName].forEach(t => {
      console.log(`  - ${t.meeting_name} (${t.member_count} ${t.member_type})`);
    });
  });
} else {
  console.log('❌ NO TEMPLATES FOUND IN DATABASE!');
  console.log('\nThis means:');
  console.log('1. UI shows 8 meetings but database has 0');
  console.log('2. Possible table name mismatch?');
  console.log('3. Or data not synced?');
}

// 4. Check if there's a different table
console.log('\n=== CHECKING ALTERNATIVE TABLES ===\n');

const { data: recurringMeetings, error: rmError } = await supabase
  .from('recurring_meetings')
  .select('*')
  .limit(5);

if (!rmError && recurringMeetings) {
  console.log(`✅ Found 'recurring_meetings' table: ${recurringMeetings.length} rows`);
  if (recurringMeetings.length > 0) {
    console.log('First row:', JSON.stringify(recurringMeetings[0], null, 2));
  }
} else {
  console.log('❌ No recurring_meetings table');
}

console.log('\n=== CHECK COMPLETE ===\n');
