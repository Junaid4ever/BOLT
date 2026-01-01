import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import readline from 'readline';

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function cleanupRecurringTemplates() {
  console.log('\n🧹 Recurring Templates Cleanup Tool\n');

  const { data: templates, error } = await supabase
    .from('recurring_meeting_templates')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    rl.close();
    return;
  }

  if (templates.length === 0) {
    console.log('✅ No active recurring templates found. Nothing to clean up.');
    rl.close();
    return;
  }

  console.log(`Found ${templates.length} active recurring templates:\n`);

  templates.forEach((template, index) => {
    console.log(`${index + 1}. ${template.meeting_name}`);
    console.log(`   Client: ${template.client_name}`);
    console.log(`   Time: ${template.hour}:${String(template.minutes).padStart(2, '0')} ${template.time_period}`);
    console.log(`   Members: ${template.member_count} ${template.member_type}`);
    console.log(`   ID: ${template.id}\n`);
  });

  console.log('\n⚠️  OPTIONS:');
  console.log('1. Delete specific template by number');
  console.log('2. Delete ALL templates (DANGER!)');
  console.log('3. Exit without changes\n');

  const choice = await question('Enter your choice (1-3): ');

  if (choice === '1') {
    const num = await question('Enter template number to delete: ');
    const index = parseInt(num) - 1;

    if (index >= 0 && index < templates.length) {
      const template = templates[index];
      const confirm = await question(`\n⚠️  Delete "${template.meeting_name}" for ${template.client_name}? (yes/no): `);

      if (confirm.toLowerCase() === 'yes') {
        const { error: deleteError } = await supabase
          .from('recurring_meeting_templates')
          .update({ is_active: false })
          .eq('id', template.id);

        if (deleteError) {
          console.error('❌ Error deleting:', deleteError);
        } else {
          console.log('✅ Template deleted successfully!');

          const { error: meetingError } = await supabase
            .from('meetings')
            .delete()
            .eq('recurring_template_id', template.id)
            .gte('scheduled_date', new Date().toISOString().split('T')[0]);

          if (!meetingError) {
            console.log('✅ Future meetings also deleted.');
          }
        }
      }
    } else {
      console.log('❌ Invalid number');
    }
  } else if (choice === '2') {
    const confirm = await question('\n⚠️⚠️⚠️  DELETE ALL RECURRING TEMPLATES? This cannot be undone! (type "DELETE ALL" to confirm): ');

    if (confirm === 'DELETE ALL') {
      const { error: deleteError } = await supabase
        .from('recurring_meeting_templates')
        .update({ is_active: false })
        .eq('is_active', true);

      if (deleteError) {
        console.error('❌ Error:', deleteError);
      } else {
        console.log('✅ All recurring templates deleted!');

        const { error: meetingError } = await supabase
          .from('meetings')
          .delete()
          .eq('is_recurring', true)
          .gte('scheduled_date', new Date().toISOString().split('T')[0]);

        if (!meetingError) {
          console.log('✅ All future recurring meetings also deleted.');
        }
      }
    } else {
      console.log('❌ Cancelled');
    }
  } else {
    console.log('👋 Exiting without changes');
  }

  rl.close();
}

cleanupRecurringTemplates();
