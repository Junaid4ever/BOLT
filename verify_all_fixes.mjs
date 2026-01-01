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

console.log('Connecting to Supabase...\n');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('=== CHECKING MOHD JUNAID STATUS ===\n');

const { data: junaid, error: junaidError } = await supabase
  .from('users')
  .select('id, name, role')
  .eq('name', 'MOHD JUNAID')
  .single();

if (junaidError) {
  console.error('Error fetching MOHD JUNAID:', junaidError);
} else {
  console.log('MOHD JUNAID status:', junaid);
  if (junaid.role === 'admin') {
    console.log('✅ MOHD JUNAID is correctly set as ADMIN');
  } else {
    console.log('⚠️ MOHD JUNAID role is:', junaid.role, '(should be admin)');
  }
}

console.log('\n=== TESTING MEETING INSERT ===\n');

const testMeeting = {
  meeting_name: 'Test Meeting',
  meeting_id: '1234567890',
  password: 'test123',
  hour: 8,
  minutes: 0,
  time_period: 'PM',
  member_count: 1,
  member_type: 'indian',
  attended: false
};

console.log('Attempting to insert test meeting without status field...');
const { data: insertData, error: insertError } = await supabase
  .from('meetings')
  .insert([testMeeting])
  .select();

if (insertError) {
  console.error('❌ Meeting insert failed:', insertError.message);
  console.error('Error code:', insertError.code);
  console.log('\n⚠️ You need to run the fix first!');
  console.log('Open this page in your browser:');
  console.log('http://localhost:5173/fix-meeting-issues.html');
} else {
  console.log('✅ Test meeting inserted successfully!');
  console.log('Meeting data:', insertData[0]);

  if (insertData && insertData.length > 0) {
    console.log('\nCleaning up test meeting...');
    const { error: deleteError } = await supabase
      .from('meetings')
      .delete()
      .eq('id', insertData[0].id);

    if (deleteError) {
      console.error('Error deleting test meeting:', deleteError);
    } else {
      console.log('✅ Test meeting cleaned up');
    }
  }
}

console.log('\n=== TESTING MEETING INSERT WITH SCREENSHOT ===\n');

const testMeetingWithScreenshot = {
  meeting_name: 'Test Meeting With Screenshot',
  meeting_id: '9876543210',
  password: 'test456',
  hour: 9,
  minutes: 30,
  time_period: 'AM',
  member_count: 2,
  member_type: 'indian',
  attended: true,
  screenshot_url: 'https://example.com/screenshot.png'
};

console.log('Attempting to insert meeting with screenshot...');
const { data: insertData2, error: insertError2 } = await supabase
  .from('meetings')
  .insert([testMeetingWithScreenshot])
  .select();

if (insertError2) {
  console.error('❌ Meeting with screenshot insert failed:', insertError2.message);
} else {
  console.log('✅ Meeting with screenshot inserted successfully!');

  if (insertData2 && insertData2.length > 0) {
    console.log('Cleaning up...');
    await supabase
      .from('meetings')
      .delete()
      .eq('id', insertData2[0].id);
    console.log('✅ Cleaned up');
  }
}

console.log('\n=== SUMMARY ===\n');
console.log('1. MOHD JUNAID Status:', junaid?.role === 'admin' ? '✅ ADMIN' : '❌ NOT ADMIN');
console.log('2. Meeting Insert:', insertError ? '❌ FAILED' : '✅ WORKING');
console.log('\nIf meeting insert failed, please run the SQL fix at:');
console.log('http://localhost:5173/fix-meeting-issues.html');
console.log('\n=== DONE ===\n');
