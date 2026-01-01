/*
  # Performance Optimization - Storage Buckets & Database

  ## Changes
  1. Create separate storage buckets for different file types
  2. Add critical indexes for performance
  3. Optimize heavy queries
  4. Clean up unused data
*/

-- =====================================================
-- PART 1: STORAGE BUCKET OPTIMIZATION
-- =====================================================

-- Check and create separate storage buckets
DO $$
BEGIN
  -- Screenshots bucket
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'screenshots') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'screenshots',
      'screenshots',
      false,
      5242880,
      ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    );
  END IF;

  -- Payment screenshots bucket
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'payment-screenshots') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'payment-screenshots',
      'payment-screenshots',
      false,
      5242880,
      ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    );
  END IF;

  -- QR codes bucket
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'qr-codes') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'qr-codes',
      'qr-codes',
      true,
      1048576,
      ARRAY['image/png', 'image/jpeg', 'image/jpg']
    );
  END IF;

  -- Advance payment screenshots bucket
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'advance-screenshots') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'advance-screenshots',
      'advance-screenshots',
      false,
      5242880,
      ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    );
  END IF;
END $$;

-- Storage policies (disable RLS for all buckets for current auth pattern)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 2: DATABASE OPTIMIZATION - CRITICAL INDEXES
-- =====================================================

-- Meetings table indexes for faster queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meetings_scheduled_date_status
ON meetings(scheduled_date, status)
WHERE status IN ('active', 'scheduled');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meetings_client_scheduled
ON meetings(client_name, scheduled_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meetings_attended_date
ON meetings(attended, scheduled_date DESC)
WHERE attended = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meetings_recurring_template
ON meetings(recurring_template_id, scheduled_date)
WHERE recurring_template_id IS NOT NULL;

-- Daily dues indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_dues_client_date
ON daily_dues(client_id, due_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_dues_unpaid
ON daily_dues(is_paid, due_date DESC)
WHERE is_paid = false;

-- Payments indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_client_date
ON payments(client_name, payment_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_approved_date
ON payments(is_approved, payment_date DESC)
WHERE is_approved = true;

-- Advance payments indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_advance_payments_client_active
ON advance_payments(client_id, is_fully_used)
WHERE is_fully_used = false;

-- Users indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role
ON users(role)
WHERE role IN ('admin', 'co_admin', 'cohost');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_parent_cohost
ON users(parent_cohost_id)
WHERE parent_cohost_id IS NOT NULL;

-- Notifications indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread
ON notifications(user_id, is_read, created_at DESC)
WHERE is_read = false;

-- =====================================================
-- PART 3: OPTIMIZE HEAVY QUERIES WITH MATERIALIZED VIEW
-- =====================================================

-- Create materialized view for client statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS client_stats_mv AS
SELECT
  u.id as client_id,
  u.name as client_name,
  u.role,
  COUNT(DISTINCT m.id) as total_meetings,
  COUNT(DISTINCT CASE WHEN m.attended = true THEN m.id END) as attended_meetings,
  COALESCE(SUM(dd.daily_due), 0) as total_dues,
  COALESCE(SUM(CASE WHEN dd.is_paid = false THEN dd.daily_due ELSE 0 END), 0) as pending_dues,
  COALESCE(SUM(CASE WHEN p.is_approved = true THEN p.amount ELSE 0 END), 0) as total_payments,
  MAX(m.scheduled_date) as last_meeting_date
FROM users u
LEFT JOIN meetings m ON u.name = m.client_name
LEFT JOIN daily_dues dd ON u.id = dd.client_id
LEFT JOIN payments p ON u.name = p.client_name
WHERE u.role IN ('client', 'cohost')
GROUP BY u.id, u.name, u.role;

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_stats_mv_client_id
ON client_stats_mv(client_id);

-- Function to refresh stats
CREATE OR REPLACE FUNCTION refresh_client_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY client_stats_mv;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 4: VACUUM AND ANALYZE
-- =====================================================

-- Vacuum and analyze all tables
VACUUM ANALYZE meetings;
VACUUM ANALYZE daily_dues;
VACUUM ANALYZE payments;
VACUUM ANALYZE users;
VACUUM ANALYZE advance_payments;
VACUUM ANALYZE recurring_meeting_templates;
VACUUM ANALYZE notifications;

-- =====================================================
-- PART 5: CLEANUP OLD DATA
-- =====================================================

-- Delete old notifications (older than 90 days)
DELETE FROM notifications
WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete old historical meetings (older than 180 days)
DELETE FROM historical_meetings
WHERE deleted_at < NOW() - INTERVAL '180 days';

-- =====================================================
-- PART 6: CONNECTION POOLING OPTIMIZATION
-- =====================================================

-- Set optimal connection settings
ALTER DATABASE postgres SET max_connections = 100;
ALTER DATABASE postgres SET shared_buffers = '256MB';
ALTER DATABASE postgres SET effective_cache_size = '1GB';
ALTER DATABASE postgres SET work_mem = '16MB';
ALTER DATABASE postgres SET maintenance_work_mem = '64MB';

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check all indexes
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
