import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fkypxitgnfqbfplxokve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc'
);

console.log('Updating meetings table to add wrong_credentials status...');

const { error } = await supabase.rpc('exec_sql', { 
  sql_query: `ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_status_check; ALTER TABLE meetings ADD CONSTRAINT meetings_status_check CHECK (status IN ('active', 'not_live', 'cancelled', 'wrong_credentials'));`
});

if (error) {
  console.error('Error:', error);
  console.log('\nTrying alternative approach...');
  
  const { error: error1 } = await supabase.rpc('exec_sql', { 
    sql_query: `ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_status_check`
  });
  
  if (error1) {
    console.error('Error dropping constraint:', error1);
  } else {
    console.log('✓ Dropped old constraint');
    
    const { error: error2 } = await supabase.rpc('exec_sql', { 
      sql_query: `ALTER TABLE meetings ADD CONSTRAINT meetings_status_check CHECK (status IN ('active', 'not_live', 'cancelled', 'wrong_credentials'))`
    });
    
    if (error2) {
      console.error('Error adding constraint:', error2);
    } else {
      console.log('✓ Added new constraint with wrong_credentials status!');
    }
  }
} else {
  console.log('✓ Migration applied successfully!');
}

process.exit(0);
