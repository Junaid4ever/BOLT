import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fkypxitgnfqbfplxokve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc'
);

console.log('\n🗑️  DELETING WRONG BLOCKISTA MEETING\n');

const today = new Date().toISOString().split('T')[0];

const { data: meeting, error: fetchError } = await supabase
  .from('meetings')
  .select('*')
  .eq('client_name', 'Prashant')
  .ilike('meeting_name', '%blockista%')
  .eq('scheduled_date', today)
  .maybeSingle();

if (fetchError) {
  console.log('Error:', fetchError.message);
} else if (meeting) {
  console.log('Found Blockista meeting on Monday (skip day):');
  console.log('  ID:', meeting.id);
  console.log('  Created:', new Date(meeting.created_at).toLocaleString());
  
  const { error: deleteError } = await supabase
    .from('meetings')
    .delete()
    .eq('id', meeting.id);
  
  if (deleteError) {
    console.log('\n❌ Delete failed:', deleteError.message);
  } else {
    console.log('\n✅ Deleted successfully!');
  }
} else {
  console.log('✅ No wrong meeting found (already clean)');
}

console.log('\n');
