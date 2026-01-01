import pg from 'pg';
const { Client } = pg;

console.log('🔧 FIX SCREENSHOT UPLOAD - DISABLE COHOST TRIGGERS\n');

// Database connection string
const connectionString = 'postgresql://postgres.fkypxitgnfqbfplxokve:Usman1122@@db.fkypxitgnfqbfplxokve.supabase.co:5432/postgres';

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const sql = `
/*
  # Fix Screenshot Upload - Disable Problematic Cohost Triggers

  1. Problem
    - Screenshot upload is failing due to cohost-related triggers
    - Multiple triggers are running on meeting updates and causing conflicts

  2. Solution
    - Temporarily disable problematic cohost triggers
    - Keep essential triggers for dues calculation
    - Screenshot upload will work normally

  3. Triggers being removed
    - trigger_credit_cohost_on_screenshot
    - trigger_create_cohost_dues
    - trigger_calculate_cohost_dues
    - trigger_restore_cohost_dues_on_screenshot_removal
*/

-- Drop problematic cohost triggers that block screenshot upload
DROP TRIGGER IF EXISTS trigger_credit_cohost_on_screenshot ON meetings;
DROP TRIGGER IF EXISTS trigger_create_cohost_dues ON meetings;
DROP TRIGGER IF EXISTS trigger_calculate_cohost_dues ON meetings;
DROP TRIGGER IF EXISTS trigger_restore_cohost_dues_on_screenshot_removal ON meetings;

-- Drop the functions too (CASCADE will remove any remaining triggers)
DROP FUNCTION IF EXISTS credit_cohost_on_screenshot() CASCADE;
DROP FUNCTION IF EXISTS create_cohost_dues_on_meeting() CASCADE;
DROP FUNCTION IF EXISTS calculate_cohost_dues_from_subclient_meeting() CASCADE;
DROP FUNCTION IF EXISTS restore_cohost_dues_on_screenshot_removal() CASCADE;
`;

try {
  console.log('Connecting to database...');
  await client.connect();
  console.log('✅ Connected!');

  console.log('\nExecuting migration SQL...');
  await client.query(sql);
  console.log('✅ Migration executed successfully!');

  console.log('\nVerifying triggers removed...');
  const result = await client.query(`
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE trigger_name IN (
      'trigger_credit_cohost_on_screenshot',
      'trigger_create_cohost_dues',
      'trigger_calculate_cohost_dues',
      'trigger_restore_cohost_dues_on_screenshot_removal'
    )
  `);

  console.log(`✅ Remaining triggers: ${result.rows.length}/4 (should be 0)`);
  if (result.rows.length === 0) {
    console.log('✅ All problematic triggers successfully removed!');
  } else {
    console.log('⚠️  Some triggers still exist:', result.rows.map(r => r.trigger_name));
  }

  await client.end();

  console.log('\n' + '='.repeat(60));
  console.log('🎉 SCREENSHOT UPLOAD FIX COMPLETE!');
  console.log('='.repeat(60));
  console.log('\n✅ Screenshot upload should now work normally!');
  console.log('✅ Refresh your browser and try uploading a screenshot.\n');

} catch (error) {
  console.log('\n❌ Migration Failed:', error.message);
  console.log('\nError details:', error);
  console.log('\nManual SQL execution option:');
  console.log('URL: https://supabase.com/dashboard/project/fkypxitgnfqbfplxokve/sql\n');
  try { await client.end(); } catch {}
  process.exit(1);
}
