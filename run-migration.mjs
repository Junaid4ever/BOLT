import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const sql = readFileSync(process.argv[2], 'utf-8');
const lines = sql.split('\n').filter(l => !l.trim().startsWith('--') && !l.trim().startsWith('/*'));
const queries = lines.join('\n').split(';').filter(q => q.trim());

console.log('Running', queries.length, 'queries...');

for (const query of queries) {
  if (!query.trim()) continue;
  console.log('Executing:', query.substring(0, 50) + '...');
  
  const { error } = await supabase.rpc('exec_sql', { sql_query: query });
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✓ Success');
  }
}
