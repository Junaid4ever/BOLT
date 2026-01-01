import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
  console.log('Checking database schema...\n');

  // Get a sample user to see all columns
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Users table columns:');
    Object.keys(data).sort().forEach(col => {
      console.log(`  - ${col}`);
    });
    console.log('\nHas parent_user_id:', 'parent_user_id' in data);
  }

  // Check meetings table
  const { data: meetingData, error: meetingError } = await supabase
    .from('meetings')
    .select('*')
    .limit(1)
    .single();

  if (meetingError) {
    console.error('\nMeetings Error:', meetingError);
  } else {
    console.log('\n\nMeetings table columns:');
    Object.keys(meetingData).sort().forEach(col => {
      console.log(`  - ${col}`);
    });
    console.log('\nHas cohost_id:', 'cohost_id' in meetingData);
  }

  // Check daily_dues
  const { data: dueData, error: dueError } = await supabase
    .from('daily_dues')
    .select('*')
    .limit(1)
    .single();

  if (dueError) {
    console.error('\nDaily Dues Error:', dueError);
  } else {
    console.log('\n\nDaily Dues table columns:');
    Object.keys(dueData).sort().forEach(col => {
      console.log(`  - ${col}`);
    });
    console.log('\nHas cohost_id:', 'cohost_id' in dueData);
  }
}

checkSchema().catch(console.error);
