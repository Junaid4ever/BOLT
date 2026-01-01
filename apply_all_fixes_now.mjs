import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const { Client } = pg;

const supabaseUrl = 'https://fkypxitgnfqbfplxokve.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MjE0ODksImV4cCI6MjA3NjE5NzQ4OX0.Swk4AqJrRBNnEIdSGS3QjfU-okNKN2LGSL43Ha1h4Cc';
const databaseUrl = 'postgresql://postgres.fkypxitgnfqbfplxokve:PeY6jzSECJKqXSCf@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

const client = new Client({ connectionString: databaseUrl });

async function applyAllFixes() {
  console.log('\n🚀 APPLYING ALL FIXES...\n');

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // FIX 1: Add selected_days column
    console.log('1️⃣  Adding selected_days column to recurring_meeting_templates...');
    await client.query(`
      ALTER TABLE recurring_meeting_templates
      ADD COLUMN IF NOT EXISTS selected_days integer[] DEFAULT ARRAY[0,1,2,3,4,5,6];
    `);

    await client.query(`
      UPDATE recurring_meeting_templates
      SET selected_days = ARRAY[0,1,2,3,4,5,6]
      WHERE selected_days IS NULL;
    `);
    console.log('   ✅ selected_days column added\n');

    // FIX 2: Check if co-host trigger exists
    console.log('2️⃣  Checking co-host dues trigger...');
    const { rows: triggers } = await client.query(`
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE trigger_name = 'trigger_calculate_cohost_dues'
      AND event_object_table = 'meetings';
    `);

    if (triggers.length === 0) {
      console.log('   ⚠️  Trigger missing! Creating now...\n');

      // Create the function
      await client.query(`
        CREATE OR REPLACE FUNCTION calculate_cohost_dues_on_meeting()
        RETURNS TRIGGER AS $$
        DECLARE
          v_cohost_id uuid;
          v_cohost_name text;
          v_admin_rate numeric := 1;
          v_member_count integer;
          v_meeting_date date;
        BEGIN
          IF NEW.attended = true AND NEW.screenshot_url IS NOT NULL AND
             (OLD.attended IS NULL OR OLD.attended = false OR OLD.screenshot_url IS NULL) THEN

            SELECT u.parent_user_id, p.name, COALESCE(p.admin_rate, 1)
            INTO v_cohost_id, v_cohost_name, v_admin_rate
            FROM users u
            LEFT JOIN users p ON u.parent_user_id = p.id
            WHERE u.id = NEW.client_id;

            IF v_cohost_id IS NOT NULL THEN
              v_member_count := COALESCE(NEW.member_count, 0);
              v_meeting_date := COALESCE(NEW.scheduled_date, CURRENT_DATE);

              INSERT INTO daily_dues (
                client_id,
                client_name,
                date,
                amount,
                original_amount,
                meeting_count,
                advance_adjustment,
                created_at,
                updated_at
              ) VALUES (
                v_cohost_id,
                v_cohost_name,
                v_meeting_date,
                v_member_count * v_admin_rate,
                v_member_count * v_admin_rate,
                1,
                0,
                now(),
                now()
              )
              ON CONFLICT (client_id, date)
              DO UPDATE SET
                amount = daily_dues.amount + (v_member_count * v_admin_rate),
                original_amount = daily_dues.original_amount + (v_member_count * v_admin_rate),
                meeting_count = daily_dues.meeting_count + 1,
                updated_at = now();
            END IF;
          END IF;

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await client.query(`
        DROP TRIGGER IF EXISTS trigger_calculate_cohost_dues ON meetings;
      `);

      await client.query(`
        CREATE TRIGGER trigger_calculate_cohost_dues
          AFTER INSERT OR UPDATE ON meetings
          FOR EACH ROW
          EXECUTE FUNCTION calculate_cohost_dues_on_meeting();
      `);

      console.log('   ✅ Co-host trigger created!\n');
    } else {
      console.log('   ✅ Co-host trigger already exists\n');
    }

    // FIX 3: Add test recurring meeting
    console.log('3️⃣  Adding test recurring meeting...');
    const { rows: clients } = await client.query(`
      SELECT id, name FROM users WHERE role = 'client' AND parent_user_id IS NULL LIMIT 1;
    `);

    if (clients.length > 0) {
      const clientId = clients[0].id;
      const clientName = clients[0].name;

      await client.query(`
        INSERT INTO recurring_meeting_templates (
          client_id, client_name, meeting_name, meeting_id,
          password, hour, minutes, time_period,
          member_count, member_type, is_active, selected_days
        ) VALUES (
          $1, $2, 'Daily Test Meeting', '9999999999',
          'test123', 2, 0, 'PM',
          25, 'indian', true,
          ARRAY[0,1,2,3,4,5,6]
        )
        ON CONFLICT DO NOTHING;
      `, [clientId, clientName]);

      console.log(`   ✅ Test recurring meeting added for ${clientName}\n`);
    } else {
      console.log('   ⚠️  No regular clients found to add test meeting\n');
    }

    console.log('✅ ALL FIXES APPLIED SUCCESSFULLY!\n');

    // Final verification
    console.log('📊 FINAL VERIFICATION:\n');

    const { rows: templateCount } = await client.query(
      'SELECT COUNT(*) as count FROM recurring_meeting_templates WHERE is_active = true'
    );
    console.log(`   Recurring templates: ${templateCount[0].count}`);

    const { rows: triggerCheck } = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.triggers
      WHERE trigger_name = 'trigger_calculate_cohost_dues';
    `);
    console.log(`   Co-host trigger: ${triggerCheck[0].count > 0 ? '✅ EXISTS' : '❌ MISSING'}`);

    console.log('\n🎉 DONE! Everything is ready!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

applyAllFixes();
