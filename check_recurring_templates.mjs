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

async function checkRecurringTemplates() {
  console.log('\n🔍 Checking all recurring meeting templates...\n');

  const { data: templates, error } = await supabase
    .from('recurring_meeting_templates')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Found ${templates.length} active recurring templates:\n`);

  templates.forEach((template, index) => {
    console.log(`${index + 1}. ${template.meeting_name}`);
    console.log(`   Client: ${template.client_name} (${template.client_id})`);
    console.log(`   Time: ${template.hour}:${String(template.minutes).padStart(2, '0')} ${template.time_period}`);
    console.log(`   Members: ${template.member_count} ${template.member_type}`);
    console.log(`   Created: ${new Date(template.created_at).toLocaleString()}`);
    console.log(`   ID: ${template.id}\n`);
  });

  const { data: clients, error: clientError } = await supabase
    .from('users')
    .select('id, name')
    .eq('role', 'client');

  if (!clientError && clients) {
    console.log('\n📋 Active Clients:');
    clients.forEach(client => {
      const templateCount = templates.filter(t => t.client_id === client.id).length;
      console.log(`   ${client.name}: ${templateCount} recurring meetings`);
    });
  }
}

checkRecurringTemplates();
