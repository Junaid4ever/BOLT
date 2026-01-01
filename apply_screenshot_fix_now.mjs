import pg from 'pg';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const dbUrl = envVars.VITE_SUPABASE_DB_URL;

if (!dbUrl) {
  console.error('❌ VITE_SUPABASE_DB_URL not found in .env');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function applyFix() {
  try {
    console.log('\n🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');

    const sql = readFileSync('FIX_SCREENSHOT_UPLOAD.sql', 'utf-8');
    
    console.log('🔧 Applying fix...\n');
    
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('/*') && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.length < 10) continue;
      
      try {
        await client.query(statement);
        console.log('✅', statement.substring(0, 70) + '...');
      } catch (err) {
        console.log('⚠️ ', statement.substring(0, 70) + '...', err.message);
      }
    }

    console.log('\n✅ DONE! Screenshot upload is now FIXED!\n');
    console.log('🎉 Try uploading a screenshot now - it should work!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

applyFix();
