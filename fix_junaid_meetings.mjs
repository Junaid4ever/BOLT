import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fkypxitgnfqbfplxokve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc'
);

console.log('\n🔧 FIXING JUNAID MEETING\n');

const { data: vinod } = await supabase
  .from('users')
  .select('id')
  .eq('name', 'Vinod')
  .single();

if (!vinod) {
  console.log('❌ Vinod not found');
  process.exit(1);
}

console.log('Vinod ID:', vinod.id);

const { data: meetings } = await supabase
  .from('meetings')
  .select('id, meeting_name, scheduled_date, cohost_id')
  .eq('client_name', 'JUNAID')
  .is('cohost_id', null);

console.log('\nJUNAID meetings with null cohost_id:', meetings?.length || 0);

if (meetings && meetings.length > 0) {
  console.log('\nUpdating meetings...');

  for (const meeting of meetings) {
    const { error } = await supabase
      .from('meetings')
      .update({ cohost_id: vinod.id })
      .eq('id', meeting.id);

    if (error) {
      console.log('❌ Error:', error.message);
    } else {
      console.log('✅ Fixed:', meeting.meeting_name, '(' + (meeting.scheduled_date || 'instant') + ')');
    }
  }

  console.log('\n🎉 Done! Vinod can now see JUNAID\'s meetings.');
} else {
  console.log('\n✅ All JUNAID meetings already have cohost_id set.');
}
