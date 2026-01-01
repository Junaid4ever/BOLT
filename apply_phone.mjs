import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://fkypxitgnfqbfplxokve.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYyMTQ4OSwiZXhwIjoyMDc2MTk3NDg5fQ.xnWmC2U1gMfKjbzxYLvmXlgVAf5hfwC1U5s1iPKZ7jw';

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

const sql = readFileSync('./supabase/migrations/20251211060615_add_phone_number_to_users.sql', 'utf-8');

const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

if (error) {
  console.error('Error:', error.message);
  process.exit(1);
} else {
  console.log('✅ Migration applied!');
}
