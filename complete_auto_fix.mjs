import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fkypxitgnfqbfplxokve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYyMTQ4OSwiZXhwIjoyMDc2MTk3NDg5fQ.O-3T6dPJvA14bTg6KxIxE0VmTzLPwKXU1FeFWb9yFqw',
  {
    db: {
      schema: 'public'
    }
  }
);

console.log('\n🔧 COMPLETE AUTO-FIX STARTING...\n');

const sql1 = `ALTER TABLE meetings DROP CONSTRAINT IF EXISTS meetings_status_check`;
const sql2 = `ALTER TABLE meetings ADD CONSTRAINT meetings_status_check CHECK (status IN ('active', 'not_live', 'cancelled', 'wrong_credentials'))`;

const sql3 = `CREATE OR REPLACE FUNCTION ensure_client_recurring_meetings(p_client_name text)
RETURNS integer AS $$
DECLARE
  template_rec RECORD;
  meeting_exists boolean;
  new_meeting_id uuid;
  created_count integer := 0;
  current_day_of_week integer;
  should_create boolean;
BEGIN
  current_day_of_week := EXTRACT(DOW FROM CURRENT_DATE)::integer;
  FOR template_rec IN SELECT * FROM recurring_meeting_templates WHERE client_name = p_client_name AND is_active = true LOOP
    should_create := false;
    IF template_rec.selected_days IS NULL OR jsonb_array_length(template_rec.selected_days) = 0 THEN
      should_create := true;
    ELSIF template_rec.selected_days ? current_day_of_week::text THEN
      should_create := true;
    END IF;
    IF NOT should_create THEN CONTINUE; END IF;
    SELECT EXISTS (SELECT 1 FROM meetings WHERE recurring_template_id = template_rec.id AND scheduled_date = CURRENT_DATE AND status != 'cancelled') INTO meeting_exists;
    IF NOT meeting_exists THEN
      INSERT INTO meetings (client_name, meeting_name, meeting_id, password, hour, minutes, time_period, member_count, member_type, scheduled_date, is_recurring, recurring_template_id, auto_created, is_instant, attended, status)
      VALUES (template_rec.client_name, template_rec.meeting_name, template_rec.meeting_id, template_rec.password, template_rec.hour, template_rec.minutes, template_rec.time_period, template_rec.member_count, template_rec.member_type, CURRENT_DATE, true, template_rec.id, true, false, false, 'active')
      RETURNING id INTO new_meeting_id;
      UPDATE recurring_meeting_templates SET last_created_date = CURRENT_DATE, updated_at = now() WHERE id = template_rec.id;
      created_count := created_count + 1;
    END IF;
  END LOOP;
  RETURN created_count;
END;
$$ LANGUAGE plpgsql`;

const sql4 = `CREATE OR REPLACE FUNCTION create_todays_recurring_meetings()
RETURNS TABLE(created_count integer, meeting_name text, client_name text) AS $$
DECLARE
  template_rec RECORD;
  meeting_exists boolean;
  new_meeting_id uuid;
  total_created integer := 0;
  current_day_of_week integer;
  should_create boolean;
BEGIN
  current_day_of_week := EXTRACT(DOW FROM CURRENT_DATE)::integer;
  FOR template_rec IN SELECT * FROM recurring_meeting_templates WHERE is_active = true LOOP
    should_create := false;
    IF template_rec.selected_days IS NULL OR jsonb_array_length(template_rec.selected_days) = 0 THEN
      should_create := true;
    ELSIF template_rec.selected_days ? current_day_of_week::text THEN
      should_create := true;
    END IF;
    IF NOT should_create THEN CONTINUE; END IF;
    SELECT EXISTS (SELECT 1 FROM meetings WHERE recurring_template_id = template_rec.id AND scheduled_date = CURRENT_DATE AND status != 'cancelled') INTO meeting_exists;
    IF NOT meeting_exists THEN
      INSERT INTO meetings (client_name, meeting_name, meeting_id, password, hour, minutes, time_period, member_count, member_type, scheduled_date, is_recurring, recurring_template_id, auto_created, is_instant, attended, status)
      VALUES (template_rec.client_name, template_rec.meeting_name, template_rec.meeting_id, template_rec.password, template_rec.hour, template_rec.minutes, template_rec.time_period, template_rec.member_count, template_rec.member_type, CURRENT_DATE, true, template_rec.id, true, false, false, 'active')
      RETURNING id INTO new_meeting_id;
      UPDATE recurring_meeting_templates SET last_created_date = CURRENT_DATE, updated_at = now() WHERE id = template_rec.id;
      total_created := total_created + 1;
      RETURN QUERY SELECT 1::integer, template_rec.meeting_name, template_rec.client_name;
    END IF;
  END LOOP;
  IF total_created = 0 THEN RETURN QUERY SELECT 0::integer, 'No new meetings created'::text, ''::text; END IF;
  RETURN;
END;
$$ LANGUAGE plpgsql`;

const sql5 = `CREATE OR REPLACE FUNCTION create_daily_meetings()
RETURNS integer AS $$
DECLARE
  created_count integer := 0;
  recurring_rec RECORD;
  today_str text;
  today_dow integer;
  meeting_exists boolean;
  is_excluded boolean;
  should_run_today boolean;
BEGIN
  today_str := CURRENT_DATE::text;
  today_dow := EXTRACT(DOW FROM CURRENT_DATE)::integer;
  FOR recurring_rec IN SELECT * FROM recurring_meeting_templates WHERE is_active = true LOOP
    should_run_today := false;
    IF recurring_rec.selected_days IS NULL OR jsonb_array_length(recurring_rec.selected_days) = 0 THEN
      should_run_today := true;
    ELSIF recurring_rec.selected_days ? today_dow::text THEN
      should_run_today := true;
    END IF;
    IF NOT should_run_today THEN CONTINUE; END IF;
    IF recurring_rec.excluded_dates IS NOT NULL THEN
      SELECT EXISTS (SELECT 1 FROM jsonb_array_elements_text(recurring_rec.excluded_dates) AS excluded_date WHERE excluded_date = today_str) INTO is_excluded;
      IF is_excluded THEN CONTINUE; END IF;
    END IF;
    SELECT EXISTS (SELECT 1 FROM meetings WHERE recurring_template_id = recurring_rec.id AND scheduled_date = CURRENT_DATE AND status != 'cancelled') INTO meeting_exists;
    IF NOT meeting_exists THEN
      INSERT INTO meetings (client_id, client_name, meeting_name, meeting_id, password, hour, minutes, time_period, member_count, member_type, scheduled_date, is_recurring, recurring_template_id, auto_created, is_instant, attended, status)
      VALUES (recurring_rec.client_id, recurring_rec.client_name, recurring_rec.meeting_name, recurring_rec.meeting_id, recurring_rec.password, recurring_rec.hour, recurring_rec.minutes, recurring_rec.time_period, recurring_rec.member_count, recurring_rec.member_type, CURRENT_DATE, true, recurring_rec.id, true, false, false, 'active');
      created_count := created_count + 1;
      UPDATE recurring_meeting_templates SET last_created_date = CURRENT_DATE, updated_at = now() WHERE id = recurring_rec.id;
    END IF;
  END LOOP;
  RETURN created_count;
END;
$$ LANGUAGE plpgsql`;

console.log('Opening browser with auto-fix page...\n');
console.log('Page will automatically:');
console.log('  1. Drop old status constraint');
console.log('  2. Add new status constraint');
console.log('  3. Update 3 database functions');
console.log('  4. Fix both issues completely\n');

import { writeFileSync } from 'fs';
import { exec } from 'child_process';

const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Auto-Fixing</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;background:#0f172a;color:#fff;padding:40px;min-height:100vh;display:flex;align-items:center;justify-content:center}.box{background:#1e293b;border:3px solid #10b981;border-radius:16px;padding:50px;max-width:600px;width:100%}h1{color:#10b981;font-size:36px;text-align:center;margin-bottom:30px}#s{text-align:center;font-size:22px;line-height:1.8;padding:30px;background:#0f172a;border-radius:12px;min-height:200px;display:flex;align-items:center;justify-content:center;flex-direction:column}.sp{border:4px solid #334155;border-top:4px solid #10b981;border-radius:50%;width:50px;height:50px;animation:spin 1s linear infinite;margin-bottom:20px}@keyframes spin{100%{transform:rotate(360deg)}}.ok{background:#10b981;color:#000;font-size:32px;font-weight:900;padding:40px;border-radius:16px}.er{color:#ef4444;font-size:18px}</style>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head><body><div class="box"><h1>🔧 Auto-Fixing</h1><div id="s"><div class="sp"></div><div>Applying fixes...</div></div></div>
<script type="module">
const{createClient}=supabase;
const sb=createClient('https://fkypxitgnfqbfplxokve.supabase.co','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZreXB4aXRnbmZxYmZwbHhva3ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDYyMTQ4OSwiZXhwIjoyMDc2MTk3NDg5fQ.O-3T6dPJvA14bTg6KxIxE0VmTzLPwKXU1FeFWb9yFqw');
const s=document.getElementById('s');
async function r(q){const{error}=await sb.rpc('exec_sql',{sql_query:q});if(error)throw error}
(async()=>{try{
s.innerHTML='<div class="sp"></div><div>1/5</div>';await r(\`${sql1}\`);
s.innerHTML='<div class="sp"></div><div>2/5</div>';await r(\`${sql2}\`);
s.innerHTML='<div class="sp"></div><div>3/5</div>';await r(\`${sql3}\`);
s.innerHTML='<div class="sp"></div><div>4/5</div>';await r(\`${sql4}\`);
s.innerHTML='<div class="sp"></div><div>5/5</div>';await r(\`${sql5}\`);
s.innerHTML='<div class="ok">✅ FIX HO GAYA!<br><br><div style="font-size:18px">Dono issues fix<br>Refresh admin panel</div></div>';
}catch(e){s.innerHTML='<div class="er">❌ '+e.message+'</div>';console.error(e)}})();
</script></body></html>`;

writeFileSync('auto_fix_page.html', html);

exec('python3 -m webbrowser -t "file://' + process.cwd() + '/auto_fix_page.html"', (err) => {
  if (err) {
    console.log('❌ Could not open browser automatically');
    console.log('\n📌 MANUAL STEP:');
    console.log('   Open this file in your browser:');
    console.log('   file://' + process.cwd() + '/auto_fix_page.html\n');
  } else {
    console.log('✅ Browser opened with auto-fix page!\n');
    console.log('Wait 5 seconds for fixes to apply automatically.\n');
  }
});
