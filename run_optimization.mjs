import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runOptimization() {
  console.log('🚀 Starting performance optimization...\n');

  try {
    const sqlContent = readFileSync('./optimize_performance.sql', 'utf-8');

    const sqlStatements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.match(/^\/\*/));

    console.log(`📝 Found ${sqlStatements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < sqlStatements.length; i++) {
      const stmt = sqlStatements[i];

      if (stmt.includes('DO $$') || stmt.includes('CREATE') || stmt.includes('ALTER') ||
          stmt.includes('VACUUM') || stmt.includes('DELETE') || stmt.includes('INSERT') ||
          stmt.includes('REFRESH')) {

        const preview = stmt.substring(0, 80).replace(/\s+/g, ' ');
        process.stdout.write(`[${i + 1}/${sqlStatements.length}] ${preview}...`);

        try {
          const { error } = await supabase.rpc('exec_sql', { sql_query: stmt + ';' });

          if (error) {
            if (error.message.includes('already exists') ||
                error.message.includes('does not exist') ||
                error.message.includes('cannot run inside a transaction')) {
              console.log(' ⚠️  SKIP (expected)');
            } else {
              console.log(` ❌ ERROR: ${error.message.substring(0, 50)}`);
              errorCount++;
            }
          } else {
            console.log(' ✅');
            successCount++;
          }
        } catch (err) {
          console.log(` ❌ ${err.message.substring(0, 50)}`);
          errorCount++;
        }
      }
    }

    console.log(`\n\n📊 OPTIMIZATION SUMMARY:`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`\n🎉 Performance optimization complete!`);

  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

runOptimization();
