import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTriggers() {
  console.log('\n🔧 FIXING SCREENSHOT UPLOAD - DISABLING problematic cohost triggers...\n');

  const fixes = [
    'DROP TRIGGER IF EXISTS trigger_credit_cohost_on_screenshot ON meetings;',
    'DROP TRIGGER IF EXISTS trigger_create_cohost_dues ON meetings;',
    'DROP TRIGGER IF EXISTS trigger_calculate_cohost_dues ON meetings;',
    'DROP TRIGGER IF EXISTS trigger_restore_cohost_dues_on_screenshot_removal ON meetings;',
    'DROP FUNCTION IF EXISTS credit_cohost_on_screenshot() CASCADE;',
    'DROP FUNCTION IF EXISTS create_cohost_dues_on_meeting() CASCADE;',
    'DROP FUNCTION IF EXISTS calculate_cohost_dues_from_subclient_meeting() CASCADE;',
    'DROP FUNCTION IF EXISTS restore_cohost_dues_on_screenshot_removal() CASCADE;'
  ];

  for (const fix of fixes) {
    const { error } = await supabase.rpc('exec_sql', { sql: fix });
    if (error) {
      console.log('❌', fix.substring(0, 60), '...', error.message);
    } else {
      console.log('✅', fix.substring(0, 70));
    }
  }

  console.log('\n✅ DONE! Screenshot upload should work now!\n');
}

fixTriggers();
