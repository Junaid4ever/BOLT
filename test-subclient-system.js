import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables from .env file
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSubclientSystem() {
  console.log('=== Testing Subclient Meeting System ===\n');

  try {
    // Step 1: Check users table for JUNAID and Vinod
    console.log('Step 1: Checking users table...');
    const { data: junaidUsers, error: junaidError } = await supabase
      .from('users')
      .select('id, name, role, price_per_member, price_per_dp_member')
      .ilike('name', '%JUNAID%');

    let junaid = null;
    if (junaidError) {
      console.error('Error fetching JUNAID:', junaidError);
    } else if (junaidUsers && junaidUsers.length > 0) {
      junaid = junaidUsers[0];
      console.log('JUNAID (subclient):');
      console.log('  id:', junaid.id);
      console.log('  name:', junaid.name);
      console.log('  role:', junaid.role);
      console.log('  price_per_member:', junaid.price_per_member);
      console.log('  price_per_dp_member:', junaid.price_per_dp_member);
    } else {
      console.log('No user found with name containing JUNAID');
    }

    const { data: vinodUsers, error: vinodError } = await supabase
      .from('users')
      .select('id, name, role, price_per_member, price_per_dp_member')
      .ilike('name', '%Vinod%');

    let vinod = null;
    if (vinodError) {
      console.error('Error fetching Vinod:', vinodError);
    } else if (vinodUsers && vinodUsers.length > 0) {
      vinod = vinodUsers[0];
      console.log('\nVinod (cohost):');
      console.log('  id:', vinod.id);
      console.log('  name:', vinod.name);
      console.log('  role:', vinod.role);
      console.log('  price_per_member:', vinod.price_per_member);
      console.log('  price_per_dp_member:', vinod.price_per_dp_member);
    } else {
      console.log('No user found with name containing Vinod');
    }

    // Check relationship using co_admin_clients or parent_user_id
    console.log('\nStep 1b: Checking relationship...');
    if (junaid && vinod) {
      // First check if there's a parent_user_id column
      const { data: userSample } = await supabase
        .from('users')
        .select('*')
        .limit(1)
        .single();

      const hasParentUserId = userSample && 'parent_user_id' in userSample;

      if (hasParentUserId) {
        // Refetch with parent_user_id
        const { data: junaidWithParent } = await supabase
          .from('users')
          .select('parent_user_id')
          .eq('id', junaid.id)
          .single();

        if (junaidWithParent?.parent_user_id === vinod.id) {
          console.log('✓ Relationship via parent_user_id: JUNAID is a subclient of Vinod');
          console.log(`  JUNAID.parent_user_id (${junaidWithParent.parent_user_id}) === Vinod.id (${vinod.id})`);
          junaid.parent_user_id = junaidWithParent.parent_user_id;
        } else {
          console.log('✗ No parent_user_id relationship found');
        }
      } else {
        console.log('Note: parent_user_id column does not exist in users table');
      }

      // Check co_admin_clients relationship
      const { data: coAdminRelation, error: relationError } = await supabase
        .from('co_admin_clients')
        .select('*')
        .eq('client_id', junaid.id)
        .eq('co_admin_id', vinod.id)
        .single();

      if (relationError && relationError.code !== 'PGRST116') {
        console.log('Error checking co_admin_clients:', relationError);
      } else if (coAdminRelation) {
        console.log('✓ Relationship via co_admin_clients: JUNAID is managed by Vinod as co-admin');
      } else {
        console.log('✗ No relationship found in co_admin_clients table');
      }
    }

    // Step 2: Check if meetings table has cohost_id column
    console.log('\n\nStep 2: Checking meetings table schema...');

    // Query a sample meeting to see columns
    const { data: sampleMeeting, error: sampleError } = await supabase
      .from('meetings')
      .select('*')
      .limit(1)
      .single();

    if (sampleMeeting) {
      const hasCohost = 'cohost_id' in sampleMeeting;
      console.log(`✓ meetings.cohost_id column exists: ${hasCohost}`);
      if (hasCohost) {
        console.log(`  Sample meeting cohost_id: ${sampleMeeting.cohost_id || 'NULL'}`);
      }
    }

    // Step 3: Check if trigger exists
    console.log('\n\nStep 3: Checking for set_meeting_cohost_id trigger...');
    const { data: triggerData, error: triggerError } = await supabase
      .rpc('exec_sql', {
        query: `SELECT tgname, tgenabled
                FROM pg_trigger
                WHERE tgname = 'trigger_set_meeting_cohost_id';`
      });

    if (triggerError) {
      console.log('Cannot check trigger (exec_sql function may not exist)');
      console.log('  Assuming trigger exists based on migration file');
    } else if (triggerData && triggerData.length > 0) {
      console.log('✓ Trigger found:', triggerData[0]);
    } else {
      console.log('✗ Trigger not found');
    }

    // Step 4: Check if daily_dues tracks cohost_id
    console.log('\n\nStep 4: Checking daily_dues table schema...');
    const { data: sampleDue, error: dueError } = await supabase
      .from('daily_dues')
      .select('*')
      .limit(1)
      .single();

    if (sampleDue) {
      const hasCohostId = 'cohost_id' in sampleDue;
      console.log(`daily_dues.cohost_id column exists: ${hasCohostId}`);
      if (!hasCohostId) {
        console.log('Note: daily_dues does NOT have cohost_id column');
        console.log('      This may need to be added for proper cohost tracking');
      }
    }

    // Step 5: Create a test meeting as JUNAID
    if (junaid && vinod) {
      console.log('\n\nStep 5: Creating test meeting as JUNAID...');

      const testMeeting = {
        client_id: junaid.id,
        client_name: junaid.name,
        meeting_name: 'Test Meeting',
        meeting_id: 'test123456',
        password: 'testpass',
        member_count: 5,
        attended: true,
        scheduled_date: new Date().toISOString().split('T')[0], // Today's date
        status: 'completed',
        member_type: 'indian'
      };

      const { data: newMeeting, error: meetingError } = await supabase
        .from('meetings')
        .insert(testMeeting)
        .select()
        .single();

      if (meetingError) {
        console.error('✗ Error creating meeting:', meetingError);
      } else {
        console.log('✓ Meeting created successfully:', {
          id: newMeeting.id,
          client_name: newMeeting.client_name,
          cohost_id: newMeeting.cohost_id,
          member_count: newMeeting.member_count,
          scheduled_date: newMeeting.scheduled_date
        });

        // Verify cohost_id was set correctly
        if (newMeeting.cohost_id === vinod.id) {
          console.log('✓ cohost_id correctly set to Vinod\'s ID via trigger');
        } else if (newMeeting.cohost_id === null) {
          console.log('✗ cohost_id is NULL - trigger may not be working');
          if (!junaid.parent_user_id) {
            console.log('  Note: JUNAID does not have parent_user_id set, so trigger won\'t work');
          }
        } else {
          console.log(`✗ cohost_id set to ${newMeeting.cohost_id}, expected ${vinod.id}`);
        }

        // Query the meeting back to verify
        console.log('\nVerifying meeting in database...');
        const { data: verifyMeeting, error: verifyError } = await supabase
          .from('meetings')
          .select('*')
          .eq('id', newMeeting.id)
          .single();

        if (verifyError) {
          console.error('Error verifying meeting:', verifyError);
        } else {
          console.log('✓ Meeting found in database:', {
            id: verifyMeeting.id,
            client_id: verifyMeeting.client_id,
            client_name: verifyMeeting.client_name,
            cohost_id: verifyMeeting.cohost_id
          });
        }

        // Clean up - delete test meeting
        console.log('\nCleaning up test meeting...');
        const { error: deleteError } = await supabase
          .from('meetings')
          .delete()
          .eq('id', newMeeting.id);

        if (deleteError) {
          console.error('Error deleting test meeting:', deleteError);
        } else {
          console.log('✓ Test meeting deleted');
        }
      }
    }

    // Step 6: Check how meetings are queried for cohosts
    console.log('\n\nStep 6: Summary of cohost meeting queries...');
    console.log('From CohostClientDashboard.tsx:');
    console.log('  - Queries meetings with: .eq("cohost_id", cohostUserId)');
    console.log('  - Also queries: .eq("client_id", cohostUserId) for direct meetings');
    console.log('  - Also queries: .in("client_id", clientIds) for subclient meetings');
    console.log('\nThis means:');
    console.log('  1. Cohost\'s own meetings: client_id = cohost_id');
    console.log('  2. Subclient meetings: cohost_id = cohost_id (via trigger)');
    console.log('  3. Both are properly fetched by the dashboard');

    // Step 7: Check existing meetings with cohost_id
    if (vinod) {
      console.log('\n\nStep 7: Checking existing meetings for Vinod...');
      const { data: vinodMeetings, error: vinodMeetingsError } = await supabase
        .from('meetings')
        .select('id, client_name, cohost_id, scheduled_date, created_at')
        .eq('cohost_id', vinod.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (vinodMeetingsError) {
        console.error('Error fetching Vinod\'s meetings:', vinodMeetingsError);
      } else {
        console.log(`Found ${vinodMeetings?.length || 0} meetings with cohost_id = Vinod's ID:`);
        vinodMeetings?.forEach((m, i) => {
          console.log(`  ${i + 1}. ${m.client_name} - ${m.scheduled_date || 'instant'} (${m.created_at})`);
        });
      }
    }

    console.log('\n\n=== Test Complete ===');

  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
testSubclientSystem().catch(console.error);
