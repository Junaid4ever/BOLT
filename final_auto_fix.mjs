import fetch from 'node-fetch';

const SUPABASE_URL = 'https://fkypxitgnfqbfplxokve.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYyMTQ4OSwiZXhwIjoyMDc2MTk3NDg5fQ.O-3T6dPJvA14bTg6KxIxE0VmTzLPwKXU1FeFWb9yFqw';

async function execSql(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    },
    body: JSON.stringify({ sql_query: sql })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  return await res.json();
}

console.log('\n🔧 AUTO-FIXING DONO ISSUES...\n');

try {
  console.log('1/5: Dropping old status constraint...');
  await execSql('ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_status_check');
  console.log('     ✅ Done\n');

  console.log('2/5: Adding new status constraint...');
  await execSql(`ALTER TABLE meetings ADD CONSTRAINT meetings_status_check CHECK (status IN ('active', 'not_live', 'cancelled', 'wrong_credentials'))`);
  console.log('     ✅ Done\n');

  console.log('3/5: Updating ensure_client_recurring_meetings...');
  await execSql(`CREATE OR REPLACE FUNCTION ensure_client_recurring_meetings(p_client_name text) RETURNS integer AS $$ DECLARE template_rec RECORD; meeting_exists boolean; new_meeting_id uuid; created_count integer := 0; current_day_of_week integer; should_create boolean; BEGIN current_day_of_week := EXTRACT(DOW FROM CURRENT_DATE)::integer; FOR template_rec IN SELECT * FROM recurring_meeting_templates WHERE client_name = p_client_name AND is_active = true LOOP should_create := false; IF template_rec.selected_days IS NULL OR jsonb_array_length(template_rec.selected_days) = 0 THEN should_create := true; ELSIF template_rec.selected_days ? current_day_of_week::text THEN should_create := true; END IF; IF NOT should_create THEN CONTINUE; END IF; SELECT EXISTS (SELECT 1 FROM meetings WHERE recurring_template_id = template_rec.id AND scheduled_date = CURRENT_DATE AND status != 'cancelled') INTO meeting_exists; IF NOT meeting_exists THEN INSERT INTO meetings (client_name, meeting_name, meeting_id, password, hour, minutes, time_period, member_count, member_type, scheduled_date, is_recurring, recurring_template_id, auto_created, is_instant, attended, status) VALUES (template_rec.client_name, template_rec.meeting_name, template_rec.meeting_id, template_rec.password, template_rec.hour, template_rec.minutes, template_rec.time_period, template_rec.member_count, template_rec.member_type, CURRENT_DATE, true, template_rec.id, true, false, false, 'active') RETURNING id INTO new_meeting_id; UPDATE recurring_meeting_templates SET last_created_date = CURRENT_DATE, updated_at = now() WHERE id = template_rec.id; created_count := created_count + 1; END IF; END LOOP; RETURN created_count; END; $$ LANGUAGE plpgsql`);
  console.log('     ✅ Done\n');

  console.log('4/5: Updating create_todays_recurring_meetings...');
  await execSql(`CREATE OR REPLACE FUNCTION create_todays_recurring_meetings() RETURNS TABLE(created_count integer, meeting_name text, client_name text) AS $$ DECLARE template_rec RECORD; meeting_exists boolean; new_meeting_id uuid; total_created integer := 0; current_day_of_week integer; should_create boolean; BEGIN current_day_of_week := EXTRACT(DOW FROM CURRENT_DATE)::integer; FOR template_rec IN SELECT * FROM recurring_meeting_templates WHERE is_active = true LOOP should_create := false; IF template_rec.selected_days IS NULL OR jsonb_array_length(template_rec.selected_days) = 0 THEN should_create := true; ELSIF template_rec.selected_days ? current_day_of_week::text THEN should_create := true; END IF; IF NOT should_create THEN CONTINUE; END IF; SELECT EXISTS (SELECT 1 FROM meetings WHERE recurring_template_id = template_rec.id AND scheduled_date = CURRENT_DATE AND status != 'cancelled') INTO meeting_exists; IF NOT meeting_exists THEN INSERT INTO meetings (client_name, meeting_name, meeting_id, password, hour, minutes, time_period, member_count, member_type, scheduled_date, is_recurring, recurring_template_id, auto_created, is_instant, attended, status) VALUES (template_rec.client_name, template_rec.meeting_name, template_rec.meeting_id, template_rec.password, template_rec.hour, template_rec.minutes, template_rec.time_period, template_rec.member_count, template_rec.member_type, CURRENT_DATE, true, template_rec.id, true, false, false, 'active') RETURNING id INTO new_meeting_id; UPDATE recurring_meeting_templates SET last_created_date = CURRENT_DATE, updated_at = now() WHERE id = template_rec.id; total_created := total_created + 1; RETURN QUERY SELECT 1::integer, template_rec.meeting_name, template_rec.client_name; END IF; END LOOP; IF total_created = 0 THEN RETURN QUERY SELECT 0::integer, 'No new meetings created'::text, ''::text; END IF; RETURN; END; $$ LANGUAGE plpgsql`);
  console.log('     ✅ Done\n');

  console.log('5/5: Updating create_daily_meetings...');
  await execSql(`CREATE OR REPLACE FUNCTION create_daily_meetings() RETURNS integer AS $$ DECLARE created_count integer := 0; recurring_rec RECORD; today_str text; today_dow integer; meeting_exists boolean; is_excluded boolean; should_run_today boolean; BEGIN today_str := CURRENT_DATE::text; today_dow := EXTRACT(DOW FROM CURRENT_DATE)::integer; FOR recurring_rec IN SELECT * FROM recurring_meeting_templates WHERE is_active = true LOOP should_run_today := false; IF recurring_rec.selected_days IS NULL OR jsonb_array_length(recurring_rec.selected_days) = 0 THEN should_run_today := true; ELSIF recurring_rec.selected_days ? today_dow::text THEN should_run_today := true; END IF; IF NOT should_run_today THEN CONTINUE; END IF; IF recurring_rec.excluded_dates IS NOT NULL THEN SELECT EXISTS (SELECT 1 FROM jsonb_array_elements_text(recurring_rec.excluded_dates) AS excluded_date WHERE excluded_date = today_str) INTO is_excluded; IF is_excluded THEN CONTINUE; END IF; END IF; SELECT EXISTS (SELECT 1 FROM meetings WHERE recurring_template_id = recurring_rec.id AND scheduled_date = CURRENT_DATE AND status != 'cancelled') INTO meeting_exists; IF NOT meeting_exists THEN INSERT INTO meetings (client_id, client_name, meeting_name, meeting_id, password, hour, minutes, time_period, member_count, member_type, scheduled_date, is_recurring, recurring_template_id, auto_created, is_instant, attended, status) VALUES (recurring_rec.client_id, recurring_rec.client_name, recurring_rec.meeting_name, recurring_rec.meeting_id, recurring_rec.password, recurring_rec.hour, recurring_rec.minutes, recurring_rec.time_period, recurring_rec.member_count, recurring_rec.member_type, CURRENT_DATE, true, recurring_rec.id, true, false, false, 'active'); created_count := created_count + 1; UPDATE recurring_meeting_templates SET last_created_date = CURRENT_DATE, updated_at = now() WHERE id = recurring_rec.id; END IF; END LOOP; RETURN created_count; END; $$ LANGUAGE plpgsql`);
  console.log('     ✅ Done\n');

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅✅✅  DONO ISSUES FIX HO GAYE!  ✅✅✅');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('Fixed:');
  console.log('  ✓ Mark as Not Live button');
  console.log('  ✓ Mark as Wrong Credentials button');
  console.log('  ✓ Selected days bug (Blockista)');
  console.log('  ✓ All 4 database functions\n');

} catch (error) {
  console.error('\n❌ Error:', error.message);
}
