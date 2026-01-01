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

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

console.log('Checking database...\n');

// Check meetings table structure
const { data: meetings, error: meetingsError } = await supabase
  .from('meetings')
  .select('*')
  .limit(1);

console.log('Meetings columns:', meetings && meetings[0] ? Object.keys(meetings[0]) : 'No data');
if (meetingsError) console.log('Meetings Error:', meetingsError);

// Check if MOHD JUNAID exists and his role
const { data: users, error: usersError } = await supabase
  .from('users')
  .select('*')
  .ilike('username', '%junaid%');

console.log('\nJUNAID user info:', JSON.stringify(users, null, 2));
if (usersError) console.log('Users Error:', usersError);

// Check all admins
const { data: allUsers } = await supabase
  .from('users')
  .select('id, username, role')
  .order('created_at');

console.log('\nAll users:', JSON.stringify(allUsers, null, 2));
