import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fkypxitgnfqbfplxokve.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYyMTQ4OSwiZXhwIjoyMDc2MTk3NDg5fQ.eGJk-6p9Lxa7PoiIqPFYSrAIzNZJ8k4kjDRcIX7Wog8'
);

console.log('\n🔧 FIXING EXISTING SUB-CLIENT MEETINGS\n');

async function fixExistingMeetings() {
  // 1. Get all sub-clients (users with parent_user_id)
  const { data: subclients } = await supabase
    .from('users')
    .select('id, name, parent_user_id')
    .not('parent_user_id', 'is', null);

  if (!subclients || subclients.length === 0) {
    console.log('No sub-clients found');
    return;
  }

  console.log(`Found ${subclients.length} sub-clients\n`);

  let totalFixed = 0;
  let totalAlreadySet = 0;

  for (const subclient of subclients) {
    console.log(`\nChecking ${subclient.name}...`);

    // Get meetings where cohost_id is null
    const { data: meetings } = await supabase
      .from('meetings')
      .select('id, meeting_name, scheduled_date, cohost_id')
      .eq('client_name', subclient.name)
      .is('cohost_id', null);

    if (!meetings || meetings.length === 0) {
      console.log(`  No meetings with null cohost_id`);

      // Check if there are meetings with cohost_id already set
      const { data: existingWithCohost } = await supabase
        .from('meetings')
        .select('id')
        .eq('client_name', subclient.name)
        .not('cohost_id', 'is', null);

      if (existingWithCohost && existingWithCohost.length > 0) {
        console.log(`  ✅ ${existingWithCohost.length} meetings already have cohost_id set`);
        totalAlreadySet += existingWithCohost.length;
      }
      continue;
    }

    console.log(`  Found ${meetings.length} meetings to fix`);

    // Update all meetings to set cohost_id
    const { error: updateError } = await supabase
      .from('meetings')
      .update({ cohost_id: subclient.parent_user_id })
      .eq('client_name', subclient.name)
      .is('cohost_id', null);

    if (updateError) {
      console.log(`  ❌ Error updating: ${updateError.message}`);
    } else {
      console.log(`  ✅ Fixed ${meetings.length} meetings`);
      totalFixed += meetings.length;

      // Show sample
      meetings.slice(0, 3).forEach(m => {
        console.log(`     - ${m.meeting_name} (${m.scheduled_date || 'instant'})`);
      });
      if (meetings.length > 3) {
        console.log(`     ... and ${meetings.length - 3} more`);
      }
    }
  }

  console.log('\n\n📊 SUMMARY:');
  console.log(`  ✅ Fixed: ${totalFixed} meetings`);
  console.log(`  ✅ Already set: ${totalAlreadySet} meetings`);
  console.log(`  Total: ${totalFixed + totalAlreadySet} meetings\n`);

  if (totalFixed > 0) {
    console.log('🎉 All existing sub-client meetings now have cohost_id set!');
    console.log('   Cohosts can now see their sub-clients\' meetings.');
  }
}

fixExistingMeetings().catch(console.error);
