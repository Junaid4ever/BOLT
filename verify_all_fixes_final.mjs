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

async function verifyAllFixes() {
  console.log('\n' + '='.repeat(70));
  console.log('                   COMPLETE VERIFICATION REPORT');
  console.log('='.repeat(70) + '\n');

  console.log('🔍 FIX #1: Client Panel Recurring List\n');
  console.log('   Issue: Jagjeet ki Cipher aur Kajal ki meeting fetch nahi ho rahi thi');
  console.log('   Fix Applied: Changed table from recurring_meetings to recurring_meeting_templates');

  const { data: jagjeet } = await supabase
    .from('users')
    .select('id, name')
    .eq('name', 'jagjeet')
    .maybeSingle();

  if (jagjeet) {
    const { data: jagjeetTemplates } = await supabase
      .from('recurring_meeting_templates')
      .select('meeting_name')
      .eq('client_id', jagjeet.id)
      .eq('is_active', true);

    console.log(`   ✅ Jagjeet ke active meetings: ${jagjeetTemplates?.length || 0}`);
    if (jagjeetTemplates && jagjeetTemplates.length > 0) {
      jagjeetTemplates.forEach(t => {
        console.log(`      - ${t.meeting_name}`);
      });
    }
  }

  const { data: kajal } = await supabase
    .from('users')
    .select('id, name')
    .eq('name', 'Kajal')
    .maybeSingle();

  if (kajal) {
    const { data: kajalTemplates } = await supabase
      .from('recurring_meeting_templates')
      .select('meeting_name')
      .eq('client_id', kajal.id)
      .eq('is_active', true);

    console.log(`   ✅ Kajal ke active meetings: ${kajalTemplates?.length || 0}`);
    if (kajalTemplates && kajalTemplates.length > 0) {
      kajalTemplates.forEach(t => {
        console.log(`      - ${t.meeting_name}`);
      });
    }
  }

  console.log('\n' + '-'.repeat(70) + '\n');
  console.log('🔍 FIX #2: Selected Days Check (Prashant Blockista)\n');
  console.log('   Issue: Prashant ka Blockista har din create ho raha tha');
  console.log('   Fix Needed: SQL migration to add selected_days check');

  const { data: prashant } = await supabase
    .from('users')
    .select('id, name')
    .eq('name', 'Prashant')
    .maybeSingle();

  if (prashant) {
    const { data: blockista } = await supabase
      .from('recurring_meeting_templates')
      .select('meeting_name, selected_days')
      .eq('client_id', prashant.id)
      .eq('meeting_name', 'Blockista')
      .maybeSingle();

    if (blockista) {
      console.log(`   ✅ Blockista template found`);
      console.log(`   Selected Days: ${JSON.stringify(blockista.selected_days)}`);

      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = new Date().getDay();
      console.log(`   Today: ${days[today]} (${today})`);

      const shouldCreate = blockista.selected_days && blockista.selected_days.includes(today);
      console.log(`   Should create today: ${shouldCreate ? 'YES' : 'NO'}`);

      if (blockista.selected_days) {
        console.log('\n   Selected Days for Blockista:');
        blockista.selected_days.forEach(day => {
          console.log(`      ✅ ${days[day]} (${day})`);
        });
      }
    }
  }

  console.log('\n' + '-'.repeat(70) + '\n');
  console.log('🔍 FIX #3: Mark as Not Live Status\n');
  console.log('   Issue: Admin panel "Mark as Not Live" showing error');
  console.log('   Fix Needed: SQL migration to update status constraint');
  console.log('   ⚠️  This fix needs to be applied via Supabase dashboard');

  console.log('\n' + '='.repeat(70));
  console.log('\n📋 ACTION REQUIRED:\n');
  console.log('   1. ✅ Client Panel Fix - Already Applied (ClientPanel.tsx updated)');
  console.log('   2. ⚠️  Selected Days & Status Fix - Run SQL migration');
  console.log('\n   👉 Open: http://localhost:5173/fix-selected-days-and-status.html');
  console.log('   👉 Follow instructions to apply SQL migration');
  console.log('\n' + '='.repeat(70) + '\n');
}

verifyAllFixes();
