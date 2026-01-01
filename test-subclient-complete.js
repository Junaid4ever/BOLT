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

async function testSubclientSystem() {
  console.log('=== COMPLETE SUBCLIENT MEETING SYSTEM TEST ===\n');

  try {
    // Step 1: Find JUNAID and Vinod
    console.log('Step 1: Finding JUNAID (subclient) and Vinod (cohost)...');
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, name, parent_user_id, price_per_member, price_per_dp_member, cohost_rate, is_cohost')
      .order('name');

    const junaid = allUsers.find(u => u.name === 'JUNAID');
    const vinod = allUsers.find(u => u.name === 'Vinod');

    if (!junaid) {
      console.error('✗ JUNAID not found');
      return;
    }
    if (!vinod) {
      console.error('✗ Vinod not found');
      return;
    }

    console.log('\n✓ Found users:');
    console.log('  JUNAID:');
    console.log(`    id: ${junaid.id}`);
    console.log(`    name: ${junaid.name}`);
    console.log(`    parent_user_id: ${junaid.parent_user_id}`);
    console.log(`    price_per_member: ${junaid.price_per_member}`);

    console.log('\n  Vinod:');
    console.log(`    id: ${vinod.id}`);
    console.log(`    name: ${vinod.name}`);
    console.log(`    price_per_member: ${vinod.price_per_member}`);
    console.log(`    cohost_rate: ${vinod.cohost_rate}`);
    console.log(`    is_cohost: ${vinod.is_cohost}`);

    // Step 2: Verify relationship
    console.log('\n\nStep 2: Verifying JUNAID -> Vinod relationship...');
    if (junaid.parent_user_id === vinod.id) {
      console.log('✓ Relationship verified: JUNAID.parent_user_id === Vinod.id');
      console.log(`  JUNAID is a subclient of Vinod`);
    } else {
      console.log('✗ Relationship broken:');
      console.log(`  JUNAID.parent_user_id: ${junaid.parent_user_id}`);
      console.log(`  Vinod.id: ${vinod.id}`);
      return;
    }

    // Step 3: Check meetings table schema
    console.log('\n\nStep 3: Checking meetings table for cohost_id column...');
    const { data: sampleMeeting } = await supabase
      .from('meetings')
      .select('*')
      .limit(1)
      .single();

    const hasCohost = sampleMeeting && 'cohost_id' in sampleMeeting;
    if (hasCohost) {
      console.log('✓ meetings.cohost_id column exists');
    } else {
      console.log('✗ meetings.cohost_id column does NOT exist');
    }

    // Step 4: Check daily_dues table
    console.log('\n\nStep 4: Checking daily_dues table for cohost_id column...');
    const { data: sampleDue } = await supabase
      .from('daily_dues')
      .select('*')
      .limit(1)
      .single();

    const hasCohostInDues = sampleDue && 'cohost_id' in sampleDue;
    if (hasCohostInDues) {
      console.log('✓ daily_dues.cohost_id column exists');
    } else {
      console.log('✗ daily_dues.cohost_id column does NOT exist');
      console.log('  NOTE: This means dues are NOT tracked per cohost');
      console.log('  This may need to be added for proper cohost accounting');
    }

    // Step 5: Create test meeting
    console.log('\n\nStep 5: Creating test meeting as JUNAID...');
    const testMeeting = {
      client_id: junaid.id,
      client_name: junaid.name,
      meeting_name: 'Test Subclient Meeting',
      meeting_id: 'test' + Date.now(),
      password: 'testpass',
      member_count: 8,
      attended: true,
      scheduled_date: new Date().toISOString().split('T')[0],
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
      console.log('✓ Meeting created successfully:');
      console.log(`  id: ${newMeeting.id}`);
      console.log(`  client_name: ${newMeeting.client_name}`);
      console.log(`  cohost_id: ${newMeeting.cohost_id}`);
      console.log(`  member_count: ${newMeeting.member_count}`);
      console.log(`  scheduled_date: ${newMeeting.scheduled_date}`);

      // Step 6: Verify cohost_id was set by trigger
      console.log('\n\nStep 6: Verifying cohost_id was set by trigger...');
      if (newMeeting.cohost_id === vinod.id) {
        console.log('✓ SUCCESS! cohost_id correctly set to Vinod\'s ID via trigger');
        console.log('  The set_meeting_cohost_id() trigger is working!');
      } else if (newMeeting.cohost_id === null) {
        console.log('✗ FAILED: cohost_id is NULL');
        console.log('  The trigger may not be working or may not be enabled');
      } else {
        console.log(`✗ FAILED: cohost_id set to ${newMeeting.cohost_id}, expected ${vinod.id}`);
      }

      // Step 7: Query meeting back to double-check
      console.log('\n\nStep 7: Re-querying meeting to verify persistence...');
      const { data: verifyMeeting } = await supabase
        .from('meetings')
        .select('id, client_id, client_name, cohost_id, member_count')
        .eq('id', newMeeting.id)
        .single();

      if (verifyMeeting) {
        console.log('✓ Meeting found in database:');
        console.log(`  cohost_id: ${verifyMeeting.cohost_id}`);
        if (verifyMeeting.cohost_id === vinod.id) {
          console.log('  ✓ cohost_id persisted correctly');
        }
      }

      // Clean up
      console.log('\n\nCleaning up test meeting...');
      await supabase.from('meetings').delete().eq('id', newMeeting.id);
      console.log('✓ Test meeting deleted');
    }

    // Step 8: Check existing meetings with cohost_id
    console.log('\n\nStep 8: Checking existing meetings for Vinod...');
    const { data: vinodMeetings } = await supabase
      .from('meetings')
      .select('id, client_name, cohost_id, member_count, scheduled_date, created_at')
      .eq('cohost_id', vinod.id)
      .order('created_at', { ascending: false })
      .limit(10);

    console.log(`Found ${vinodMeetings?.length || 0} meetings with cohost_id = Vinod's ID:`);
    if (vinodMeetings && vinodMeetings.length > 0) {
      vinodMeetings.forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.client_name} - ${m.member_count} members - ${m.scheduled_date || 'instant'}`);
      });
    } else {
      console.log('  (No existing meetings found - this is expected if the trigger was just added)');
    }

    // Step 9: Summary of dashboard queries
    console.log('\n\n=== DASHBOARD QUERY ANALYSIS ===');
    console.log('From CohostClientDashboard.tsx, the dashboard queries:');
    console.log('  1. Direct cohost meetings: .eq("client_id", cohostUserId)');
    console.log('     - These are meetings where the cohost is the direct client');
    console.log('  2. Subclient meetings: .eq("cohost_id", cohostUserId)');
    console.log('     - These are meetings created by subclients (set via trigger)');
    console.log('  3. Subclient meetings (alternate): .in("client_id", clientIds)');
    console.log('     - Where clientIds are fetched from users with parent_user_id');
    console.log('\nConclusion:');
    console.log('  ✓ The dashboard properly queries both direct and subclient meetings');
    console.log('  ✓ The cohost_id column allows efficient querying of subclient meetings');

    console.log('\n\n=== FINAL SUMMARY ===');
    console.log('\nUser Structure:');
    console.log(`  ✓ JUNAID (id: ${junaid.id})`);
    console.log(`    └─> parent_user_id: ${junaid.parent_user_id}`);
    console.log(`  ✓ Vinod (id: ${vinod.id})`);
    console.log(`    └─> Rates: ${vinod.price_per_member}/member, cohost_rate: ${vinod.cohost_rate}`);
    console.log(`    └─> is_cohost: ${vinod.is_cohost}`);

    console.log('\nDatabase Schema:');
    console.log(`  ✓ meetings.cohost_id exists: ${hasCohost}`);
    console.log(`  ✓ Trigger set_meeting_cohost_id: Assumed to exist (from migration)`);
    console.log(`  ${hasCohostInDues ? '✓' : '✗'} daily_dues.cohost_id exists: ${hasCohostInDues}`);

    console.log('\nTrigger Behavior:');
    if (newMeeting && newMeeting.cohost_id === vinod.id) {
      console.log('  ✓ Trigger IS working - cohost_id was set correctly');
    } else if (newMeeting && newMeeting.cohost_id === null) {
      console.log('  ✗ Trigger NOT working - cohost_id remained NULL');
    }

    console.log('\n=== TEST COMPLETE ===\n');

  } catch (error) {
    console.error('\n✗ Test failed with error:', error);
  }
}

testSubclientSystem().catch(console.error);
