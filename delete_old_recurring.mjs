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

async function deleteOldRecurring() {
  console.log('\n🗑️ Deleting old unwanted recurring templates...\n');

  const templatesToDelete = [
    'InfyCoin',
    'Endless',
    'DaoC',
    'Treone X'
  ];

  for (const name of templatesToDelete) {
    console.log(`Deleting: ${name}...`);

    const { data: template, error: findError } = await supabase
      .from('recurring_meeting_templates')
      .select('id')
      .eq('meeting_name', name)
      .eq('is_active', true)
      .maybeSingle();

    if (findError || !template) {
      console.log(`  ⚠️  Not found or already deleted`);
      continue;
    }

    const { error: updateError } = await supabase
      .from('recurring_meeting_templates')
      .update({ is_active: false })
      .eq('id', template.id);

    if (updateError) {
      console.log(`  ❌ Error: ${updateError.message}`);
    } else {
      console.log(`  ✅ Deleted from recurring list`);

      const { error: meetingError } = await supabase
        .from('meetings')
        .delete()
        .eq('recurring_template_id', template.id)
        .gte('scheduled_date', new Date().toISOString().split('T')[0]);

      if (!meetingError) {
        console.log(`  ✅ Future meetings also deleted`);
      }
    }
  }

  console.log('\n✅ Cleanup complete!');
  console.log('\n📋 Remaining recurring templates:');

  const { data: remaining } = await supabase
    .from('recurring_meeting_templates')
    .select('meeting_name, client_name')
    .eq('is_active', true)
    .order('client_name', { ascending: true });

  if (remaining) {
    const byClient = {};
    remaining.forEach(t => {
      if (!byClient[t.client_name]) byClient[t.client_name] = [];
      byClient[t.client_name].push(t.meeting_name);
    });

    Object.entries(byClient).forEach(([client, meetings]) => {
      console.log(`\n${client}:`);
      meetings.forEach(m => console.log(`  - ${m}`));
    });
  }
}

deleteOldRecurring();
