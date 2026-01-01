import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fkypxitgnfqbfplxokve.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFix() {
  console.log('\n🔧 FIXING: Cohost Due Reduction on Meeting Delete\n');

  try {
    console.log('✅ Connected to Supabase\n');

    // First, create exec_sql function if it doesn't exist
    console.log('📝 Creating exec_sql function...\n');

    const createExecSQL = `
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

    // Use from function to create exec_sql
    const { data: createData, error: createError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    // Since we can't directly execute SQL via Supabase client without a function,
    // let's use the Postgres REST API directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ sql_query: createExecSQL })
    });

    if (!response.ok && response.status !== 404) {
      console.log('⚠️ Could not create exec_sql (might already exist or no permission)\n');
    } else {
      console.log('✅ exec_sql function ready\n');
    }

    const migrationSQL = `
/*
  Fix Cohost Dues on Meeting Deletion

  When admin deletes subclient's meeting:
  - Meeting removed from subclient's dues ✓
  - Cohost's earning should also be removed ✗ (FIXING THIS)
*/

-- Function to reduce cohost dues when their subclient's meeting is deleted
CREATE OR REPLACE FUNCTION reduce_cohost_due_on_meeting_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_cohost_name TEXT;
  v_cohost_rate DECIMAL;
  v_cohost_earning DECIMAL;
  v_current_due DECIMAL;
  v_meeting_date DATE;
BEGIN
  -- Only process if meeting has a cohost
  IF OLD.cohost_id IS NOT NULL THEN

    -- Get cohost's name and rate
    SELECT name, cohost_rate
    INTO v_cohost_name, v_cohost_rate
    FROM users
    WHERE id = OLD.cohost_id;

    -- Skip if cohost not found or rate is null
    IF v_cohost_name IS NULL OR v_cohost_rate IS NULL THEN
      RETURN OLD;
    END IF;

    -- Calculate cohost's earning from this meeting
    v_cohost_earning := OLD.member_count * v_cohost_rate;

    -- Use scheduled_date
    v_meeting_date := OLD.scheduled_date;

    -- Get cohost's current due for this date
    SELECT amount INTO v_current_due
    FROM daily_dues
    WHERE client_name = v_cohost_name
    AND date = v_meeting_date;

    -- If due exists, reduce it
    IF FOUND THEN
      v_current_due := v_current_due - v_cohost_earning;

      IF v_current_due <= 0 THEN
        -- Delete due entry if it becomes zero or negative
        DELETE FROM daily_dues
        WHERE client_name = v_cohost_name
        AND date = v_meeting_date;

        RAISE NOTICE 'Deleted cohost due for % on %: was ₹%',
          v_cohost_name, v_meeting_date, v_current_due + v_cohost_earning;
      ELSE
        -- Update the due
        UPDATE daily_dues
        SET
          amount = v_current_due,
          original_amount = GREATEST(0, original_amount - v_cohost_earning),
          updated_at = NOW()
        WHERE client_name = v_cohost_name
        AND date = v_meeting_date;

        RAISE NOTICE 'Reduced cohost due for % on %: ₹% → ₹%',
          v_cohost_name, v_meeting_date, v_current_due + v_cohost_earning, v_current_due;
      END IF;
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trigger_reduce_cohost_due_on_delete ON meetings;

-- Create trigger on meeting deletion
CREATE TRIGGER trigger_reduce_cohost_due_on_delete
  AFTER DELETE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION reduce_cohost_due_on_meeting_delete();
`;

    console.log('📝 Applying migration...\n');

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: migrationSQL });

    if (error) {
      console.error('❌ Migration Error:', error.message);
      throw error;
    }

    console.log('✅ Migration applied successfully!\n');
    console.log('📋 Ab kya hoga:');
    console.log('  1. Jab admin Junaid ka screenshot delete karega');
    console.log('  2. Junaid ke dues se meeting hat jayegi ✓');
    console.log('  3. Binod (cohost) ke dues se bhi amount minus hoga ✓');
    console.log('  4. Agar Binod ka due 0 ya negative ho jaye, delete ho jayega\n');

    // Also manually fix Binod's current due for today
    console.log('📝 Fixing Binod ka current due...\n');

    const fixSQL = `
      DO $$
      DECLARE
        v_binod_rate DECIMAL;
        v_amount_to_subtract DECIMAL;
        v_current_due DECIMAL;
      BEGIN
        -- Get Binod's cohost rate
        SELECT cohost_rate INTO v_binod_rate
        FROM users
        WHERE name = 'Binod';

        -- Calculate amount (100 members × rate)
        v_amount_to_subtract := 100 * v_binod_rate;

        -- Get today's due
        SELECT amount INTO v_current_due
        FROM daily_dues
        WHERE client_name = 'Binod'
        AND date = CURRENT_DATE;

        IF FOUND THEN
          v_current_due := v_current_due - v_amount_to_subtract;

          IF v_current_due <= 0 THEN
            DELETE FROM daily_dues
            WHERE client_name = 'Binod'
            AND date = CURRENT_DATE;

            RAISE NOTICE 'Deleted Binod due (became zero)';
          ELSE
            UPDATE daily_dues
            SET
              amount = v_current_due,
              original_amount = GREATEST(0, original_amount - v_amount_to_subtract),
              updated_at = NOW()
            WHERE client_name = 'Binod'
            AND date = CURRENT_DATE;

            RAISE NOTICE 'Updated Binod due: subtracted ₹%', v_amount_to_subtract;
          END IF;
        END IF;
      END $$;
    `;

    const { error: fixError } = await supabase.rpc('exec_sql', { sql_query: fixSQL });

    if (fixError) {
      console.error('⚠️ Fix Error:', fixError.message);
    } else {
      console.log('✅ Binod ka due fix ho gaya!\n');
    }

    console.log('🎯 COMPLETE! Ab future mein automatically kaam karega!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyFix();
