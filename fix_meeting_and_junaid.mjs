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

console.log('Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('\n=== CHECKING JUNAID USER ===\n');

const { data: users, error: usersError } = await supabase
  .from('users')
  .select('*')
  .order('created_at');

if (usersError) {
  console.error('Error fetching users:', usersError);
} else {
  console.log('All users:');
  users.forEach(user => {
    console.log(`- ${user.username} (${user.name}) - Role: ${user.role}, ID: ${user.id}`);
  });

  const junaidUser = users.find(u => u.username && u.username.toLowerCase().includes('junaid'));

  if (junaidUser) {
    console.log('\n Found JUNAID user:', junaidUser);

    if (junaidUser.role !== 'admin') {
      console.log(`\n⚠️ JUNAID role is: ${junaidUser.role}, should be: admin`);
      console.log('Fixing JUNAID role to admin...');

      const { error: updateError } = await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('id', junaidUser.id);

      if (updateError) {
        console.error('Error updating JUNAID role:', updateError);
      } else {
        console.log('✅ JUNAID role fixed to admin!');
      }
    } else {
      console.log(' JUNAID is already admin');
    }
  } else {
    console.log('\n⚠️ JUNAID user not found!');
  }
}

console.log('\n=== CHECKING MEETINGS TABLE STRUCTURE ===\n');

const { data: meetings, error: meetingsError } = await supabase
  .from('meetings')
  .select('*')
  .limit(1);

if (meetingsError) {
  console.error('Error checking meetings:', meetingsError);
} else {
  if (meetings && meetings.length > 0) {
    console.log('Meetings table columns:', Object.keys(meetings[0]).join(', '));
  } else {
    console.log('No meetings found, but table exists');
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
  attended: false,
  status: 'scheduled'
};

console.log('Attempting to insert test meeting...');
const { data: insertData, error: insertError } = await supabase
  .from('meetings')
  .insert([testMeeting])
  .select();

if (insertError) {
  console.error('❌ Error inserting test meeting:', insertError.message);
  console.error('Details:', insertError);
} else {
  console.log('✅ Test meeting inserted successfully:', insertData);

  console.log('Cleaning up test meeting...');
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

console.log('\n=== DONE ===\n');
