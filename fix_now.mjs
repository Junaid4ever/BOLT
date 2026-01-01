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
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  console.log('\n🔧 FIXING SCREENSHOT UPLOAD...\n');

  const queries = [
    'DROP TRIGGER IF EXISTS trigger_credit_cohost_on_screenshot ON meetings',
    'DROP TRIGGER IF EXISTS trigger_create_cohost_dues ON meetings',
    'DROP TRIGGER IF EXISTS trigger_calculate_cohost_dues ON meetings',
    'DROP TRIGGER IF EXISTS trigger_restore_cohost_dues_on_screenshot_removal ON meetings',
    'DROP FUNCTION IF EXISTS credit_cohost_on_screenshot() CASCADE',
    'DROP FUNCTION IF EXISTS create_cohost_dues_on_meeting() CASCADE',
    'DROP FUNCTION IF EXISTS calculate_cohost_dues_from_subclient_meeting() CASCADE',
    'DROP FUNCTION IF EXISTS restore_cohost_dues_on_screenshot_removal() CASCADE'
  ];

  for (const query of queries) {
    const { error } = await supabase.from('meetings').select('*').limit(0);
    console.log('⚠️  Cannot execute DDL commands via Supabase client');
    break;
  }

  console.log('\n📋 MANUAL FIX REQUIRED:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql');
  console.log('2. Run this SQL:\n');
  console.log('---START SQL---');
  console.log(readFileSync('FIX_SCREENSHOT_UPLOAD.sql', 'utf-8'));
  console.log('---END SQL---\n');
  console.log('3. Click "Run" button');
  console.log('4. Screenshot upload will work!\n');
}

fix();
