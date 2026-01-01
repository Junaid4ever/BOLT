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

console.log('=== FIXING MOHD JUNAID ===\n');

const { data: beforeUpdate, error: beforeError } = await supabase
  .from('users')
  .select('id, name, role')
  .eq('name', 'MOHD JUNAID')
  .single();

if (beforeError) {
  console.error('Error fetching MOHD JUNAID:', beforeError);
} else {
  console.log('Before update:', beforeUpdate);

  const { error: updateError } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('name', 'MOHD JUNAID');

  if (updateError) {
    console.error('Error updating MOHD JUNAID:', updateError);
  } else {
    console.log('✅ MOHD JUNAID role updated to admin!');

    const { data: afterUpdate } = await supabase
      .from('users')
      .select('id, name, role')
      .eq('name', 'MOHD JUNAID')
      .single();

    console.log('After update:', afterUpdate);
  }
}

console.log('\n=== FIXING STATUS CONSTRAINT ===\n');

const fixConstraintSQL = `
  ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_status_check;
  ALTER TABLE meetings ADD CONSTRAINT meetings_status_check
    CHECK (status IS NULL OR status IN ('scheduled', 'active', 'completed', 'cancelled', 'attended', 'missed'));
`;

const { error: constraintError } = await supabase.rpc('exec_sql', { sql: fixConstraintSQL }).catch(() => {
  console.log('Note: exec_sql function not available. Please run this SQL manually in Supabase:');
  console.log(fixConstraintSQL);
  return { error: null };
});

if (constraintError) {
  console.error('Error fixing constraint:', constraintError);
  console.log('\nPlease run this SQL manually in your Supabase SQL Editor:');
  console.log(fixConstraintSQL);
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

console.log('Attempting to insert test meeting...');
const { data: insertData, error: insertError } = await supabase
  .from('meetings')
  .insert([testMeeting])
  .select();

if (insertError) {
  console.error('❌ Meeting insert failed:', insertError.message);
  console.error('\nYou need to run this SQL in your Supabase SQL Editor:');
  console.log('\nALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_status_check;');
  console.log('ALTER TABLE meetings ADD CONSTRAINT meetings_status_check CHECK (status IS NULL OR status IN (\'scheduled\', \'active\', \'completed\', \'cancelled\', \'attended\', \'missed\'));');
} else {
  console.log('✅ Test meeting inserted successfully!');

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

console.log('\n=== CHECKING ADMIN USERS ===\n');

const { data: admins } = await supabase
  .from('users')
  .select('id, name, role')
  .eq('role', 'admin');

if (admins && admins.length > 0) {
  console.log('Admin users:');
  admins.forEach(admin => {
    console.log(`- ${admin.name} (ID: ${admin.id})`);
  });
} else {
  console.log('⚠️ No admin users found! This is a problem.');
}

console.log('\n=== DONE ===\n');
