import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length) {
    envVars[key.trim()] = values.join('=').trim();
  }
});

const supabase = createClient(
  envVars.VITE_SUPABASE_URL,
  envVars.VITE_SUPABASE_ANON_KEY
);

async function checkSpecificClients() {
  console.log('\n🔍 Checking Jagjeet and Kajal recurring templates...\n');

  const { data: jagjeet } = await supabase
    .from('users')
    .select('id, name')
    .eq('name', 'jagjeet')
    .maybeSingle();

  const { data: kajal } = await supabase
    .from('users')
    .select('id, name')
    .eq('name', 'Kajal')
    .maybeSingle();

  console.log('Jagjeet ID:', jagjeet?.id);
  console.log('Kajal ID:', kajal?.id);

  if (jagjeet) {
    const { data: jagjeetTemplates } = await supabase
      .from('recurring_meeting_templates')
      .select('*')
      .eq('client_id', jagjeet.id)
      .eq('is_active', true);

    console.log('\n📋 Jagjeet ke Active Recurring Templates:');
    if (jagjeetTemplates && jagjeetTemplates.length > 0) {
      jagjeetTemplates.forEach(t => {
        console.log(`  - ${t.meeting_name} (${t.hour}:${String(t.minutes).padStart(2, '0')} ${t.time_period})`);
        console.log(`    Members: ${t.member_count} ${t.member_type}`);
        console.log(`    Created: ${new Date(t.created_at).toLocaleString()}`);
      });
    } else {
      console.log('  No active recurring templates found!');
    }
  }

  if (kajal) {
    const { data: kajalTemplates } = await supabase
      .from('recurring_meeting_templates')
      .select('*')
      .eq('client_id', kajal.id)
      .eq('is_active', true);

    console.log('\n📋 Kajal ke Active Recurring Templates:');
    if (kajalTemplates && kajalTemplates.length > 0) {
      kajalTemplates.forEach(t => {
        console.log(`  - ${t.meeting_name} (${t.hour}:${String(t.minutes).padStart(2, '0')} ${t.time_period})`);
        console.log(`    Members: ${t.member_count} ${t.member_type}`);
        console.log(`    Created: ${new Date(t.created_at).toLocaleString()}`);
      });
    } else {
      console.log('  No active recurring templates found!');
    }
  }

  console.log('\n\n🔍 Checking ALL recurring templates in database...\n');

  const { data: allTemplates } = await supabase
    .from('recurring_meeting_templates')
    .select('client_name, meeting_name, is_active')
    .order('client_name', { ascending: true });

  const byClient = {};
  allTemplates?.forEach(t => {
    if (!byClient[t.client_name]) byClient[t.client_name] = { active: [], inactive: [] };
    if (t.is_active) {
      byClient[t.client_name].active.push(t.meeting_name);
    } else {
      byClient[t.client_name].inactive.push(t.meeting_name);
    }
  });

  console.log('All clients with recurring templates:');
  Object.entries(byClient).forEach(([client, meetings]) => {
    console.log(`\n${client}:`);
    if (meetings.active.length > 0) {
      console.log(`  ✅ Active: ${meetings.active.join(', ')}`);
    }
    if (meetings.inactive.length > 0) {
      console.log(`  ❌ Inactive: ${meetings.inactive.join(', ')}`);
    }
  });
}

checkSpecificClients();
