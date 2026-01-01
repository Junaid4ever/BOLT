import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fkypxitgnfqbfplxokve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc'
);

const today = new Date().toISOString().split('T')[0];

console.log('\n🔍 CHECKING: Blockista repeatedly adding on refresh\n');

// Delete any Blockista from today first
const { data: deleted } = await supabase
  .from('meetings')
  .delete()
  .eq('client_name', 'Prashant')
  .ilike('meeting_name', '%blockista%')
  .eq('scheduled_date', today)
  .select();

console.log('Deleted existing Blockista meetings:', (deleted || []).length);

// Wait 2 seconds
await new Promise(resolve => setTimeout(resolve, 2000));

// Check if it got re-added
const { data: reappeared } = await supabase
  .from('meetings')
  .select('*')
  .eq('client_name', 'Prashant')
  .ilike('meeting_name', '%blockista%')
  .eq('scheduled_date', today);

console.log('\n⏰ After 2 seconds:');
console.log('Blockista meetings found:', (reappeared || []).length);

if (reappeared && reappeared.length > 0) {
  console.log('\n❌ BUG CONFIRMED: Auto-creating despite skip day!');
  for (const m of reappeared) {
    console.log('  Created at:', new Date(m.created_at).toLocaleString());
    console.log('  Is recurring:', m.is_recurring);
    console.log('  Template ID:', m.recurring_template_id);
  }
} else {
  console.log('✅ No auto-creation detected');
}

console.log('\n📋 Template check:');
const { data: template } = await supabase
  .from('recurring_meeting_templates')
  .select('*')
  .eq('client_name', 'Prashant')
  .ilike('meeting_name', '%blockista%')
  .maybeSingle();

if (template) {
  console.log('Selected days:', template.selected_days);
  console.log('Is active:', template.is_active);
  console.log('Today (Monday = 1) should run:', template.selected_days.includes(1));
}

