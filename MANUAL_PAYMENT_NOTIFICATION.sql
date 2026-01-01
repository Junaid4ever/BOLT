/*
  Manual Payment Method Notification System

  Run these SQL commands in your Supabase SQL Editor to:
  1. Remove automatic notification trigger
  2. Create manual function that admin can call
*/

-- Step 1: Drop the automatic trigger
DROP TRIGGER IF EXISTS trigger_notify_payment_method_update ON payment_methods;

-- Step 2: Create manual function for admin to call when needed
CREATE OR REPLACE FUNCTION notify_clients_manual()
RETURNS INTEGER AS $$
DECLARE
  notification_count INTEGER;
BEGIN
  -- Insert notification for all clients
  INSERT INTO notifications (user_id, message, type, created_at, expires_at)
  SELECT
    id,
    E'⚠️ PAYMENT METHODS UPDATED / भुगतान विधि अपडेट हुई\n\n' ||
    E'🔴 IMPORTANT WARNING / महत्वपूर्ण चेतावनी:\n' ||
    E'Payment methods have been updated by admin. Please use ONLY the new payment details for all future payments.\n\n' ||
    E'भुगतान विधियों को एडमिन द्वारा अपडेट किया गया है। कृपया भविष्य के सभी भुगतानों के लिए केवल नई भुगतान विधि का उपयोग करें।\n\n' ||
    E'❌ Any payment made to old/previous methods will be LOST and will NOT be accepted.\n' ||
    E'पुरानी विधियों पर किया गया कोई भी भुगतान खो जाएगा और स्वीकार नहीं किया जाएगा।\n\n' ||
    E'✅ Please check the updated payment details in Payment Methods section.\n' ||
    E'कृपया Payment Methods सेक्शन में अपडेटेड भुगतान विवरण देखें।',
    'warning',
    now(),
    now() + interval '30 days'
  FROM users
  WHERE role = 'client';

  GET DIAGNOSTICS notification_count = ROW_COUNT;

  RETURN notification_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/*
  How to use:

  When admin wants to notify all clients about payment method changes,
  run this in Supabase SQL Editor:

  SELECT notify_clients_manual();

  This will create a notification for all clients.
*/
