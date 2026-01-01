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

async function checkTemplateSchema() {
  console.log('\n🔍 Checking recurring_meeting_templates schema\n');

  const { data, error } = await supabase
    .from('recurring_meeting_templates')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Available columns:');
    Object.keys(data[0]).forEach(key => {
      console.log(`  - ${key}: ${typeof data[0][key]} = ${JSON.stringify(data[0][key])}`);
    });
  }

  console.log('\n\n🔍 Checking ensure_client_recurring_meetings function\n');

  const { data: fnData, error: fnError } = await supabase
    .rpc('ensure_client_recurring_meetings', { p_client_name: 'Prashant' });

  if (fnError) {
    console.error('Function error:', fnError);
  } else {
    console.log('Function result:', fnData);
  }
}

checkTemplateSchema();
