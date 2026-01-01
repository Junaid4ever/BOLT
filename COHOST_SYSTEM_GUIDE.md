# Co-Host Management System Guide

## Overview
The Co-Host system allows the admin to promote clients to become co-hosts, who can then manage their own sub-clients and meetings. This creates a hierarchical management structure.

## Key Features

### 1. **Prefix-Based Auto-Signup**
- Each co-host gets a unique single-letter prefix (e.g., "V" for Vinod)
- New clients can signup using format: `{PREFIX}-{ClientName}` as email
- Example: If Vinod has prefix "V", new clients can signup with email "V-Raj" and any password
- The system automatically assigns them as Vinod's sub-client

### 2. **Co-Host Request System**
- Clients can request to become co-hosts via the "Request Co-Host" button in their panel
- Requests appear in the Admin Panel's Co-Host Management section
- Admin can approve/reject requests and assign prefixes

### 3. **Admin Co-Host Management**
- Access via Shield icon button in Admin Panel header
- **Promote to Co-Host**: Select any client and assign a prefix
- **Approve Requests**: View and approve pending co-host requests
- **Manage Co-Hosts**: View all current co-hosts and remove their status if needed

### 4. **Meeting Hierarchy**
- Admin sees ALL meetings (own + all co-hosts + all sub-clients)
- Co-hosts see their own meetings + their sub-clients' meetings
- Regular clients only see their own meetings

## Database Structure

### New Fields in `users` Table:
- `is_cohost` (boolean): Marks if user is a co-host
- `parent_user_id` (UUID): References the co-host this user belongs to
- `cohost_prefix` (text): Single letter prefix for auto-signup (e.g., "V")

### New Table: `cohost_requests`
- `id`: Unique identifier
- `user_id`: Client requesting co-host status
- `status`: 'pending' | 'approved' | 'rejected'
- `requested_at`: Timestamp
- `admin_response_at`: When admin responded
- `admin_response_by`: Who responded

## Usage Instructions

### For Admin:

#### Option 1: Direct Promotion
1. Click the Shield icon in the header
2. Select "Promote Client to Co-Host" section
3. Choose a client from dropdown
4. Enter a single letter prefix (A-Z)
5. Click "Promote to Co-Host"

#### Option 2: Approve Requests
1. When a client requests co-host status, it appears in "Pending Requests"
2. Click "Approve" on the request
3. Enter a prefix when prompted
4. Request is approved and user becomes co-host

### For Clients:

#### Request Co-Host Status:
1. Click "Request Co-Host" button in your panel header
2. Wait for admin approval
3. Once approved, you'll have co-host privileges

### For Co-Hosts:

#### Add Sub-Clients:
1. Share your prefix with new clients (e.g., "V" for Vinod)
2. New clients signup with: `{YOUR_PREFIX}-{TheirName}` as email
3. Example: `V-Raj` automatically becomes Vinod's sub-client
4. Sub-clients can use any password they want

#### Manage Your Sub-Clients:
- You'll see all your sub-clients' meetings in your panel
- You can manage their dues, payments, and meetings
- You have similar permissions to admin, but only for your hierarchy

## Example Workflow

### Scenario: Vinod becomes a Co-Host

1. **Admin promotes Vinod:**
   - Admin opens Co-Host Management
   - Selects Vinod from client list
   - Assigns prefix "V"
   - Vinod is now a co-host

2. **Vinod gets 5 sub-clients:**
   - Client 1 signs up: Email = `V-Raj`, Password = `pass123`
   - Client 2 signs up: Email = `V-Amit`, Password = `mypass`
   - Client 3 signs up: Email = `V-Priya`, Password = `secret`
   - Client 4 signs up: Email = `V-Neha`, Password = `test123`
   - Client 5 signs up: Email = `V-Karan`, Password = `hello`
   - All 5 automatically become Vinod's sub-clients

3. **These 5 clients schedule 10 meetings:**
   - Vinod's panel shows all 10 meetings
   - Admin panel also shows all 10 meetings (plus any others)
   - Each client only sees their own meetings

## Security & Permissions

- Prefixes are unique - no two co-hosts can have the same prefix
- Only admins can promote users to co-host status
- Co-hosts cannot promote other users to co-host
- Sub-clients are automatically linked to their co-host parent
- Admin always has full visibility of entire system

## Technical Implementation

### Components:
- `CoHostManagement.tsx`: Main management UI
- `ClientPanel.tsx`: Added "Request Co-Host" button
- `AdminPanel.tsx`: Integrated Co-Host Management button
- `ClientLogin.tsx`: Prefix-based auto-signup logic
- `AuthContext.tsx`: Updated to support co-host role

### Migration:
- `20251220130000_add_cohost_system.sql`: Database schema changes

## Future Enhancements

These features are set up in the database but not yet fully implemented:

1. **Separate Co-Host Panel**: Co-hosts could have their own dedicated panel
2. **Custom Payment Settings**: Co-hosts manage their own QR codes and payment methods
3. **Invoice Generation**: Co-hosts can generate invoices for their sub-clients
4. **Client Overview**: Dedicated view of all sub-clients and their stats

## Notes

- The system maintains the same login credentials for all users
- Meetings are stored in a single table with proper relationships
- Hierarchy is maintained through `parent_user_id` foreign key
- Real-time updates work for co-host requests via Supabase subscriptions
