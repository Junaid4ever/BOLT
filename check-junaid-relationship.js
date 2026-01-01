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

async function checkRelationship() {
  console.log('Checking JUNAID -> Vinod relationship...\n');

  // Get all users with parent_user_id to understand the relationships
  const { data: allUsers, error: allError } = await supabase
    .from('users')
    .select('id, name, parent_user_id, parent_cohost_id, cohost_user_id, is_cohost')
    .order('name');

  if (allError) {
    console.error('Error fetching users:', allError);
    return;
  }

  console.log('All users with parent relationships:');
  allUsers.forEach(user => {
    if (user.parent_user_id || user.parent_cohost_id || user.cohost_user_id) {
      console.log(`  ${user.name}:`);
      console.log(`    id: ${user.id}`);
      if (user.parent_user_id) console.log(`    parent_user_id: ${user.parent_user_id}`);
      if (user.parent_cohost_id) console.log(`    parent_cohost_id: ${user.parent_cohost_id}`);
      if (user.cohost_user_id) console.log(`    cohost_user_id: ${user.cohost_user_id}`);
      console.log(`    is_cohost: ${user.is_cohost}`);
    }
  });

  // Find JUNAID and Vinod specifically
  const junaid = allUsers.find(u => u.name.includes('JUNAID'));
  const vinod = allUsers.find(u => u.name.includes('Vinod'));

  console.log('\n\n=== SPECIFIC CHECK ===');
  if (junaid) {
    console.log('JUNAID:');
    console.log(`  id: ${junaid.id}`);
    console.log(`  name: ${junaid.name}`);
    console.log(`  parent_user_id: ${junaid.parent_user_id}`);
    console.log(`  parent_cohost_id: ${junaid.parent_cohost_id}`);
    console.log(`  cohost_user_id: ${junaid.cohost_user_id}`);
  } else {
    console.log('JUNAID not found');
  }

  if (vinod) {
    console.log('\nVinod:');
    console.log(`  id: ${vinod.id}`);
    console.log(`  name: ${vinod.name}`);
    console.log(`  parent_user_id: ${vinod.parent_user_id}`);
    console.log(`  is_cohost: ${vinod.is_cohost}`);
  } else {
    console.log('Vinod not found');
  }

  if (junaid && vinod) {
    console.log('\n=== RELATIONSHIP CHECK ===');
    if (junaid.parent_user_id === vinod.id) {
      console.log('✓ JUNAID.parent_user_id === Vinod.id');
      console.log('  Relationship is CORRECTLY set up!');
    } else {
      console.log('✗ JUNAID.parent_user_id does NOT equal Vinod.id');
      console.log(`  JUNAID.parent_user_id: ${junaid.parent_user_id}`);
      console.log(`  Vinod.id: ${vinod.id}`);
      console.log('  Relationship needs to be fixed!');
    }
  }
}

checkRelationship().catch(console.error);
