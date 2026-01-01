import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fkypxitgnfqbfplxokve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYyMTQ4OSwiZXhwIjoyMDc2MTk3NDg5fQ.O-3T6dPJvA14bTg6KxIxE0VmTzLPwKXU1FeFWb9yFqw'
);

console.log('\n🔍 CHECKING DATABASE TRIGGERS\n');

const { data: triggers, error } = await supabase.rpc('exec_sql', {
  sql_query: `
    SELECT 
      trigger_name,
      event_manipulation,
      event_object_table,
      action_statement,
      action_timing
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND event_object_table IN ('recurring_meeting_templates', 'meetings')
    ORDER BY event_object_table, trigger_name;
  `
});

if (error) {
  console.log('Error:', error.message);
  
  // Try alternative method
  const { data: funcs } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT 
        proname as function_name,
        prosrc as source_code
      FROM pg_proc
      WHERE proname LIKE '%recurring%'
        OR proname LIKE '%create_daily%'
      ORDER BY proname;
    `
  });
  
  if (funcs) {
    console.log('Functions with "recurring" in name:');
    for (const f of funcs) {
      console.log('\n📦', f.function_name);
      if (f.source_code && f.source_code.length < 500) {
        console.log(f.source_code.substring(0, 200));
      }
    }
  }
} else if (triggers) {
  console.log('Triggers found:', triggers.length);
  for (const t of triggers) {
    console.log('\n⚡', t.trigger_name);
    console.log('  Table:', t.event_object_table);
    console.log('  Event:', t.event_manipulation);
    console.log('  Timing:', t.action_timing);
    console.log('  Action:', t.action_statement.substring(0, 100));
  }
}

