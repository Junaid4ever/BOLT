import { writeFileSync } from 'fs';

console.log('🔧 Creating SQL file to fix duplicate meetings...\n');

const sql = `-- Allow Same Meeting Multiple Times Per Day at Different Times
-- Drop the old date-only constraint
DROP INDEX IF EXISTS idx_unique_client_meeting_date CASCADE;

-- Add new constraint with date + time
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_client_meeting_datetime
ON meetings (client_name, meeting_id, scheduled_date, hour, minutes)
WHERE status != 'deleted';`;

try {
  // Write SQL file
  writeFileSync('FIX_DUPLICATE_MEETINGS.sql', sql);
  console.log('✅ SQL file created: FIX_DUPLICATE_MEETINGS.sql\n');

  console.log('═══════════════════════════════════════');
  console.log('✅ FIX SQL READY!');
  console.log('═══════════════════════════════════════\n');
  console.log('What this will fix:');
  console.log('  OLD: Same meeting blocked on same date');
  console.log('  NEW: Same meeting allowed at different times\n');
  console.log('Example:');
  console.log('  Meeting 123 @ 10:00 AM - ✅');
  console.log('  Meeting 123 @ 03:00 PM - ✅');
  console.log('  Meeting 123 @ 03:00 PM - ❌ (exact duplicate)\n');
  console.log('SQL Preview:');
  console.log(sql);

} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
