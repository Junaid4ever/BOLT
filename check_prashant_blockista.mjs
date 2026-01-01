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

async function checkPrashantBlockista() {
  console.log('\n🔍 Checking Prashant - Blockista Meeting\n');
  console.log('='.repeat(60));

  const { data: prashant } = await supabase
    .from('users')
    .select('id, name')
    .eq('name', 'Prashant')
    .maybeSingle();

  if (!prashant) {
    console.log('❌ Prashant not found');
    return;
  }

  console.log(`✅ Prashant ID: ${prashant.id}\n`);

  const { data: templates } = await supabase
    .from('recurring_meeting_templates')
    .select('*')
    .eq('client_id', prashant.id)
    .eq('meeting_name', 'Blockista');

  if (!templates || templates.length === 0) {
    console.log('❌ No Blockista template found');
    return;
  }

  templates.forEach((template, i) => {
    console.log(`\n📋 Template ${i + 1}:`);
    console.log(`   ID: ${template.id}`);
    console.log(`   Meeting Name: ${template.meeting_name}`);
    console.log(`   Time: ${template.hour}:${String(template.minutes).padStart(2, '0')} ${template.time_period}`);
    console.log(`   Members: ${template.member_count} ${template.member_type}`);
    console.log(`   Is Active: ${template.is_active ? '✅ Yes' : '❌ No'}`);
    console.log(`   Created: ${new Date(template.created_at).toLocaleString()}`);

    if (template.day_exceptions && Object.keys(template.day_exceptions).length > 0) {
      console.log('\n   🗓️  DAY EXCEPTIONS (Days when meeting should happen):');
      const exceptions = template.day_exceptions;
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      days.forEach((day, idx) => {
        if (exceptions[idx] === true) {
          console.log(`      ✅ ${day}`);
        } else {
          console.log(`      ❌ ${day} (meeting will NOT happen)`);
        }
      });
    } else {
      console.log('   🗓️  No day exceptions - Meeting happens EVERY day');
    }
  });

  console.log('\n\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log('\nIf day_exceptions are set, the meeting should ONLY happen on those specific days.');
  console.log('The recurring meeting creation function needs to check day_exceptions.');
}

checkPrashantBlockista();
