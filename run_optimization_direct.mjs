import pg from 'pg';
import { readFileSync } from 'fs';

const { Client } = pg;

const envContent = readFileSync('./.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const connectionString = envVars.SUPABASE_DB_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('❌ Missing SUPABASE_DB_URL in .env file');
  process.exit(1);
}

async function runOptimization() {
  const client = new Client({ connectionString });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');

    console.log('🚀 Starting performance optimization...\n');

    const sqlContent = readFileSync('./optimize_performance.sql', 'utf-8');

    const blocks = [];
    let currentBlock = '';
    let inBlock = false;

    const lines = sqlContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('DO $$')) {
        inBlock = true;
        currentBlock = line + '\n';
      } else if (inBlock) {
        currentBlock += line + '\n';
        if (trimmed.endsWith('$$;')) {
          blocks.push({ type: 'DO', sql: currentBlock });
          currentBlock = '';
          inBlock = false;
        }
      } else if (trimmed.length > 0 && !trimmed.startsWith('--') && !trimmed.startsWith('/*')) {
        if (trimmed.endsWith(';')) {
          currentBlock += line;
          blocks.push({ type: 'SINGLE', sql: currentBlock });
          currentBlock = '';
        } else {
          currentBlock += line + '\n';
        }
      }
    }

    console.log(`📝 Found ${blocks.length} SQL blocks to execute\n`);

    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const preview = block.sql.substring(0, 80).replace(/\s+/g, ' ');

      process.stdout.write(`[${i + 1}/${blocks.length}] ${preview}...`);

      try {
        await client.query(block.sql);
        console.log(' ✅');
        successCount++;
      } catch (err) {
        const errMsg = err.message.toLowerCase();
        if (errMsg.includes('already exists') ||
            errMsg.includes('does not exist') ||
            errMsg.includes('duplicate') ||
            errMsg.includes('cannot run inside a transaction')) {
          console.log(' ⚠️  SKIP');
          skipCount++;
        } else {
          console.log(` ❌ ${err.message.substring(0, 60)}`);
          errorCount++;
        }
      }
    }

    console.log(`\n\n📊 OPTIMIZATION SUMMARY:`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`⚠️  Skipped: ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`\n🎉 Performance optimization complete!`);

    console.log('\n📈 Checking bucket creation...');
    const { rows: buckets } = await client.query(`
      SELECT id, name, public, file_size_limit
      FROM storage.buckets
      ORDER BY name
    `);

    console.log('\n📦 Storage Buckets:');
    buckets.forEach(b => {
      const size = (b.file_size_limit / 1024 / 1024).toFixed(1);
      const access = b.public ? '🌍 Public' : '🔒 Private';
      console.log(`  ${access} ${b.name} (${size}MB limit)`);
    });

  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Connection closed');
  }
}

runOptimization();
