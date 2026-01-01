import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.ggxwxuheqjuijxyzggap:Zoomindia@321@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'
});

async function fixDues() {
  try {
    await client.connect();
    console.log('Connected to database');

    const sql = `
      CREATE OR REPLACE FUNCTION public.calculate_daily_dues_for_client(p_client_name text, p_date date)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $function$
      DECLARE
        v_user_id UUID;
        v_indian_rate NUMERIC;
        v_dp_rate NUMERIC;
        v_total_amount NUMERIC := 0;
        v_meeting_count INTEGER := 0;
        v_meeting RECORD;
      BEGIN
        SELECT id, price_per_member, price_per_dp_member
        INTO v_user_id, v_indian_rate, v_dp_rate
        FROM users
        WHERE name = p_client_name;

        IF v_user_id IS NULL THEN
          RETURN;
        END IF;

        FOR v_meeting IN
          SELECT member_count, member_type
          FROM meetings
          WHERE client_name = p_client_name
          AND scheduled_date = p_date
          AND attended = TRUE
          AND screenshot_url IS NOT NULL
          AND screenshot_url != ''
        LOOP
          v_meeting_count := v_meeting_count + 1;
          IF v_meeting.member_type = 'dp' THEN
            v_total_amount := v_total_amount + (COALESCE(v_meeting.member_count, 0) * v_dp_rate);
          ELSE
            v_total_amount := v_total_amount + (COALESCE(v_meeting.member_count, 0) * v_indian_rate);
          END IF;
        END LOOP;

        INSERT INTO daily_dues (client_id, client_name, date, amount, meeting_count)
        VALUES (v_user_id, p_client_name, p_date, v_total_amount, v_meeting_count)
        ON CONFLICT (client_id, date)
        DO UPDATE SET
          amount = EXCLUDED.amount,
          meeting_count = EXCLUDED.meeting_count;
      END;
      $function$;
    `;

    await client.query(sql);
    console.log('Function updated to require screenshots');

    const recalcSql = `
      DO $$
      DECLARE
        v_date date;
      BEGIN
        FOR v_date IN SELECT generate_series(
          CURRENT_DATE - INTERVAL '30 days',
          CURRENT_DATE,
          '1 day'::interval
        )::date
        LOOP
          PERFORM calculate_daily_dues_for_client('Vinod', v_date);
        END LOOP;
      END $$;
    `;

    await client.query(recalcSql);
    console.log('Vinod dues recalculated');

    const checkSql = `
      SELECT date, amount, meeting_count
      FROM daily_dues
      WHERE client_name = 'Vinod'
      AND date >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY date DESC;
    `;
    const result = await client.query(checkSql);
    console.log('Vinod recent dues:', result.rows);

    await client.end();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixDues();
