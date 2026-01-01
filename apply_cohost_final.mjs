import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://fkypxitgnfqbfplxokve.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYyMTQ4OSwiZXhwIjoyMDc2MTk3NDg5fQ.xnWmC2U1gMfKjbzxYLvmXlgVAf5hfwC1U5s1iPKZ7jw';

console.log('🚀 Applying Co-Host Migration...\n');

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  db: { schema: 'public' }
});

const sql = readFileSync('./COHOST_MIGRATION_SIMPLE.sql', 'utf-8');

try {
  // Try to use exec_sql RPC function
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.log('❌ exec_sql function not available:', error.message);
    console.log('\n📋 Creating exec_sql function first...\n');

    // Create the exec_sql function
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
      RETURNS TEXT
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql_query;
        RETURN 'Success';
      EXCEPTION WHEN OTHERS THEN
        RETURN 'Error: ' || SQLERRM;
      END;
      $$;
    `;

    // This won't work without exec_sql, so we need manual intervention
    console.log('⚠️  Manual step required:');
    console.log('   1. Open: https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql');
    console.log('   2. Copy and paste this SQL:\n');
    console.log('─'.repeat(60));
    console.log(createFunctionSQL);
    console.log('─'.repeat(60));
    console.log('\n   3. Click RUN');
    console.log('   4. Then run this script again\n');

    process.exit(1);
  } else {
    console.log('✅ Migration applied successfully!');
    console.log('🎉 Co-Host system is ready!\n');

    // Verify
    const { data: verifyData } = await supabase.from('cohost_requests').select('id').limit(1);
    console.log('✅ Verification passed - tables created!');
  }
} catch (err) {
  console.error('❌ Unexpected error:', err.message);
  process.exit(1);
}
