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

async function fixDuplicates() {
  console.log('\n🔧 Finding and fixing duplicate recurring templates...\n');

  const { data: allTemplates } = await supabase
    .from('recurring_meeting_templates')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (!allTemplates) {
    console.log('❌ No templates found');
    return;
  }

  const groupedByClient = {};
  allTemplates.forEach(t => {
    const key = `${t.client_id}_${t.meeting_name}`;
    if (!groupedByClient[key]) {
      groupedByClient[key] = [];
    }
    groupedByClient[key].push(t);
  });

  let deletedCount = 0;

  for (const [key, templates] of Object.entries(groupedByClient)) {
    if (templates.length > 1) {
      console.log(`\n📌 Found ${templates.length} duplicates: ${templates[0].meeting_name} (${templates[0].client_name})`);

      const latest = templates[0];
      const duplicates = templates.slice(1);

      console.log(`   Keeping latest: ${new Date(latest.created_at).toLocaleString()}`);
      console.log(`   Deleting ${duplicates.length} older entries...`);

      for (const dup of duplicates) {
        const { error } = await supabase
          .from('recurring_meeting_templates')
          .update({ is_active: false })
          .eq('id', dup.id);

        if (!error) {
          await supabase
            .from('meetings')
            .delete()
            .eq('recurring_template_id', dup.id)
            .gte('scheduled_date', new Date().toISOString().split('T')[0]);

          deletedCount++;
          console.log(`   ✅ Deleted duplicate from ${new Date(dup.created_at).toLocaleString()}`);
        }
      }
    }
  }

  console.log(`\n✅ Cleanup complete! Deleted ${deletedCount} duplicate templates.`);

  const { data: remaining } = await supabase
    .from('recurring_meeting_templates')
    .select('meeting_name, client_name')
    .eq('is_active', true)
    .order('client_name', { ascending: true });

  if (remaining) {
    console.log(`\n📋 ${remaining.length} Clean recurring templates remaining:\n`);
    const byClient = {};
    remaining.forEach(t => {
      if (!byClient[t.client_name]) byClient[t.client_name] = [];
      byClient[t.client_name].push(t.meeting_name);
    });

    Object.entries(byClient).forEach(([client, meetings]) => {
      console.log(`${client}: ${meetings.length} recurring`);
      meetings.forEach(m => console.log(`  - ${m}`));
    });
  }
}

fixDuplicates();
