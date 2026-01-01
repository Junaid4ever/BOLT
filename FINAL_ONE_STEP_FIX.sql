-- ========================================
-- COPY THIS ENTIRE FILE AND PASTE IN SUPABASE SQL EDITOR
-- THEN PRESS RUN - DONE!
-- ========================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('screenshots', 'screenshots', false, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']),
  ('payment-screenshots', 'payment-screenshots', false, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']),
  ('advance-screenshots', 'advance-screenshots', false, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']),
  ('qr-codes', 'qr-codes', true, 1048576, ARRAY['image/png', 'image/jpeg', 'image/jpg'])
ON CONFLICT (id) DO NOTHING;

-- Disable RLS on storage.objects for current auth setup
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_date_status
  ON meetings(scheduled_date, status);

CREATE INDEX IF NOT EXISTS idx_meetings_client_scheduled
  ON meetings(client_name, scheduled_date DESC);

CREATE INDEX IF NOT EXISTS idx_meetings_attended_date
  ON meetings(attended, scheduled_date DESC)
  WHERE attended = true;

CREATE INDEX IF NOT EXISTS idx_daily_dues_client_date
  ON daily_dues(client_id, due_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_dues_unpaid
  ON daily_dues(is_paid, due_date DESC)
  WHERE is_paid = false;

CREATE INDEX IF NOT EXISTS idx_payments_client_date
  ON payments(client_name, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_payments_approved
  ON payments(is_approved, payment_date DESC)
  WHERE is_approved = true;

CREATE INDEX IF NOT EXISTS idx_advance_payments_client
  ON advance_payments(client_id, is_fully_used)
  WHERE is_fully_used = false;

CREATE INDEX IF NOT EXISTS idx_users_role
  ON users(role)
  WHERE role IN ('admin', 'co_admin', 'cohost');

CREATE INDEX IF NOT EXISTS idx_users_parent_cohost
  ON users(parent_cohost_id)
  WHERE parent_cohost_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(user_id, is_read, created_at DESC)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_meetings_recurring
  ON meetings(recurring_template_id, scheduled_date)
  WHERE recurring_template_id IS NOT NULL;

-- Delete old notifications (90+ days)
DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '90 days';

-- Vacuum and analyze for performance
VACUUM ANALYZE meetings;
VACUUM ANALYZE daily_dues;
VACUUM ANALYZE payments;
VACUUM ANALYZE users;
VACUUM ANALYZE advance_payments;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ ALL OPTIMIZATIONS APPLIED SUCCESSFULLY!';
  RAISE NOTICE '📦 Storage buckets created';
  RAISE NOTICE '📊 Performance indexes created';
  RAISE NOTICE '🧹 Old data cleaned';
  RAISE NOTICE '🚀 Database optimized';
END $$;
