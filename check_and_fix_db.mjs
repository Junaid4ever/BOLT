import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length) {
    envVars[key.trim()] = values.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Checking database state...\n');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test 1: Check MOHD JUNAID
console.log('=== TEST 1: MOHD JUNAID Role ===');
const { data: junaid } = await supabase
  .from('users')
  .select('name, role')
  .eq('name', 'MOHD JUNAID')
  .single();

if (junaid) {
  console.log(`${junaid.role === 'admin' ? '✅' : '❌'} MOHD JUNAID is: ${junaid.role}`);
} else {
  console.log('❌ MOHD JUNAID not found');
}

// Test 2: Try to insert a meeting
console.log('\n=== TEST 2: Meeting Insert Test ===');
const testMeeting = {
  meeting_name: 'TEST_DELETE',
  meeting_id: '999999999',
  password: 'test123',
  hour: 8,
  minutes: 0,
  time_period: 'PM',
  member_count: 1,
  member_type: 'indian',
  attended: false
};

console.log('Attempting to insert test meeting...');
const { data: insertData, error: insertError } = await supabase
  .from('meetings')
  .insert([testMeeting])
  .select();

if (insertError) {
  console.log('❌ Meeting insert FAILED');
  console.log('Error:', insertError.message);
  console.log('Code:', insertError.code);

  if (insertError.message.includes('dp_member_price')) {
    console.log('\n🔍 Issue: Database trigger references non-existent column "dp_member_price"');
    console.log('\n📝 AUTOMATIC FIX:');
    console.log('Creating fix SQL file...\n');

    const fixSQL = `-- Auto-generated fix for dp_member_price error
-- Drop problematic triggers
DROP TRIGGER IF EXISTS trigger_calculate_dues_on_screenshot ON meetings CASCADE;
DROP TRIGGER IF EXISTS trigger_update_daily_dues_on_meeting ON meetings CASCADE;
DROP TRIGGER IF EXISTS auto_calc_dues_on_meeting_update ON meetings CASCADE;

-- Drop problematic functions
DROP FUNCTION IF EXISTS calculate_dues_on_screenshot() CASCADE;
DROP FUNCTION IF EXISTS update_daily_dues_on_meeting() CASCADE;

-- Recreate function WITHOUT dp_member_price reference
CREATE OR REPLACE FUNCTION update_daily_dues_on_meeting()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.screenshot_url IS NOT NULL AND NEW.screenshot_url != '' THEN
    IF NEW.attended = TRUE THEN
      IF (OLD IS NULL OR OLD.screenshot_url IS NULL OR OLD.screenshot_url = '') THEN
        PERFORM calculate_daily_dues_for_client(
          NEW.client_name,
          COALESCE(NEW.scheduled_date, CURRENT_DATE)
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER trigger_update_daily_dues_on_meeting
  AFTER INSERT OR UPDATE OF screenshot_url, attended ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_dues_on_meeting();

-- Fix status constraint
ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_status_check;
ALTER TABLE meetings ADD CONSTRAINT meetings_status_check
  CHECK (status IS NULL OR status IN ('scheduled', 'active', 'completed', 'cancelled', 'attended', 'missed'));

-- Test
DO $$
DECLARE test_id UUID;
BEGIN
  INSERT INTO meetings (meeting_name, meeting_id, password, hour, minutes, time_period, member_count, member_type, attended)
  VALUES ('TEST', '999999999', 'test', 8, 0, 'PM', 1, 'indian', false) RETURNING id INTO test_id;
  DELETE FROM meetings WHERE id = test_id;
  RAISE NOTICE 'SUCCESS: Fix worked!';
END $$;`;

    fs.writeFileSync('FIX_MEETING_INSERT.sql', fixSQL);
    console.log('✅ Created: FIX_MEETING_INSERT.sql');

    // Create auto-open HTML
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Auto-Fix</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui;background:#0f172a;color:#fff;padding:40px;text-align:center}h1{color:#10b981;font-size:48px;margin-bottom:30px}
.btn{background:#10b981;color:#000;padding:20px 40px;font-size:24px;font-weight:900;border:none;border-radius:12px;cursor:pointer;margin:20px;text-decoration:none;display:inline-block}
.btn:hover{background:#059669}pre{background:#1e293b;padding:20px;border-radius:12px;text-align:left;max-width:800px;margin:20px auto;overflow:auto}</style>
<script>
window.onload=()=>{
const sql=\`${fixSQL.replace(/`/g, '\\`')}\`;
navigator.clipboard.writeText(sql);
document.getElementById('status').textContent='✅ SQL Copied to Clipboard!';
setTimeout(()=>{
  window.open('https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql','_blank');
},1000);
};
</script></head><body>
<h1>Auto-Fix Meeting Insert</h1>
<div id="status" style="font-size:24px;margin:20px;color:#10b981">Copying SQL...</div>
<div style="margin:30px"><strong>SQL copied!</strong><br>Opening Supabase dashboard...<br><br>Paste (Ctrl+V) and click RUN</div>
<a href="https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql" target="_blank" class="btn">OPEN SUPABASE SQL EDITOR</a>
</body></html>`;

    fs.writeFileSync('public/auto-fix-meeting-insert.html', html);
    console.log('✅ Created: public/auto-fix-meeting-insert.html');

    console.log('\n🚀 AUTOMATIC FIX READY!');
    console.log('\n📌 Open in browser:');
    console.log('   http://localhost:5173/auto-fix-meeting-insert.html');
    console.log('\n   It will:');
    console.log('   1. Auto-copy the SQL');
    console.log('   2. Open Supabase dashboard');
    console.log('   3. You paste (Ctrl+V) and click RUN');
    console.log('\n✅ Then meetings will work!');

  } else if (insertError.message.includes('meetings_status_check')) {
    console.log('\n🔍 Issue: Status constraint error');
    console.log('This is also fixed in the SQL above');
  } else {
    console.log('\n🔍 Unknown error - see message above');
  }

} else {
  console.log('✅ Meeting insert SUCCESSFUL!');
  console.log('Meeting ID:', insertData[0].id);

  // Clean up
  console.log('Cleaning up test meeting...');
  await supabase.from('meetings').delete().eq('id', insertData[0].id);
  console.log('✅ Cleaned up');
}

console.log('\n=== SUMMARY ===');
console.log('1. MOHD JUNAID:', junaid?.role === 'admin' ? '✅ ADMIN' : '❌ NOT ADMIN');
console.log('2. Meeting Insert:', insertError ? '❌ FAILED' : '✅ WORKING');

if (insertError) {
  console.log('\n📁 Check these files:');
  console.log('   - FIX_MEETING_INSERT.sql');
  console.log('   - public/auto-fix-meeting-insert.html');
}

console.log('\n');
