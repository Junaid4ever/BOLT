import pg from 'pg';

const { Client } = pg;

const databaseUrl = 'postgresql://postgres.fkypxitgnfqbfplxokve:PeY6jzSECJKqXSCf@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

const client = new Client({ connectionString: databaseUrl });

async function fixCohostDelete() {
  console.log('\n🔧 FIXING: Cohost Due Update on Meeting Delete\n');

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const migrationSQL = `
-- Function to handle meeting deletion
CREATE OR REPLACE FUNCTION handle_meeting_deletion()
RETURNS TRIGGER AS $$
DECLARE
  v_cohost_rate DECIMAL;
  v_cohost_earning DECIMAL;
  v_cohost_name TEXT;
  v_current_due DECIMAL;
BEGIN
  -- Only process if meeting had a cohost
  IF OLD.cohost_id IS NOT NULL THEN

    -- Get cohost's name and rate
    SELECT name, cohost_rate INTO v_cohost_name, v_cohost_rate
    FROM users
    WHERE id = OLD.cohost_id;

    -- Calculate cohost's earning from this meeting
    v_cohost_earning := OLD.member_count * v_cohost_rate;

    -- Get cohost's current due for this date
    SELECT amount INTO v_current_due
    FROM daily_dues
    WHERE client_name = v_cohost_name
    AND date = OLD.scheduled_date;

    -- If due exists
    IF FOUND THEN
      -- Calculate new due amount
      v_current_due := v_current_due - v_cohost_earning;

      -- If due becomes 0 or negative, delete the entry
      IF v_current_due <= 0 THEN
        DELETE FROM daily_dues
        WHERE client_name = v_cohost_name
        AND date = OLD.scheduled_date;

        RAISE NOTICE 'Deleted cohost due for %: was ₹%', v_cohost_name, v_current_due + v_cohost_earning;
      ELSE
        -- Otherwise, subtract the cohost earning
        UPDATE daily_dues
        SET
          amount = v_current_due,
          original_amount = original_amount - v_cohost_earning,
          updated_at = NOW()
        WHERE client_name = v_cohost_name
        AND date = OLD.scheduled_date;

        RAISE NOTICE 'Reduced cohost due for %: ₹% → ₹%', v_cohost_name, v_current_due + v_cohost_earning, v_current_due;
      END IF;
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS meeting_deletion_update_cohost_due ON meetings;

-- Create trigger on meeting deletion
CREATE TRIGGER meeting_deletion_update_cohost_due
  AFTER DELETE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION handle_meeting_deletion();
`;

    console.log('📝 Creating trigger for meeting deletion...\n');
    await client.query(migrationSQL);

    console.log('✅ Trigger created successfully!\n');
    console.log('📋 What it does:');
    console.log('  1. Checks if deleted meeting has cohost_id');
    console.log('  2. Calculates cohost earning (member_count × cohost_rate)');
    console.log('  3. Subtracts from cohost\'s daily_due for that date');
    console.log('  4. If due becomes ≤0, deletes the due entry\n');
    console.log('✅ Ab jab admin meeting delete karega:');
    console.log('  - Sub-client ka due delete hoga ✅');
    console.log('  - Cohost ke due se amount minus hoga ✅\n');

    // Verify trigger exists
    const { rows } = await client.query(`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE trigger_name = 'meeting_deletion_update_cohost_due';
    `);

    if (rows.length > 0) {
      console.log('🔍 Verification:');
      console.log('   Trigger:', rows[0].trigger_name);
      console.log('   Event:', rows[0].event_manipulation);
      console.log('   Table:', rows[0].event_object_table);
      console.log('\n🎉 PERFECT! Trigger is active!\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixCohostDelete();
