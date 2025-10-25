# Organization System Manager Guide

**Uloga:** Organization System Manager (OSM)  
**Pristup:** Upravljanje jednom organizacijom  
**Jezik:** English (SystemManager komponente su na engleskom)

---

## 🎯 Overview

As an Organization System Manager, you have administrative access to manage a single organization. You can manage members, configure organization settings, view audit logs, and handle member registrations within your organization.

---

## 🚀 OSM Dashboard

The OSM dashboard provides:

### 📊 Organization Statistics
- **Total Members** - All members in your organization
- **Active Members** - Members with current membership
- **Recent Activities** - Activities in the last 30 days
- **Pending Registrations** - Members awaiting password assignment
- **Audit Logs Count** - Total audit entries for your organization

### 🔗 Quick Navigation
- **Members** - View and manage organization members
- **Settings** - Configure organization-specific settings
- **Register Members** - Assign passwords to pending members
- **Audit Logs** - View organization activity logs

---

## 👥 Member Management

### Viewing Members
- **All Members** - Complete list of organization members
- **Filter by Status** - Active, inactive, pending
- **Filter by Role** - Member, administrator, superuser
- **Search** - Find members by name or email

### Member Registration Process
1. **Pending Members** - View members awaiting registration
2. **Assign Password** - Set initial password for new members
3. **Assign Card Number** - Optional member card assignment
4. **Activate Member** - Member becomes active and can log in

### Member Permissions
- **View Permissions** - See current member permissions
- **Update Permissions** - Modify granular permissions for administrators
- **Remove Permissions** - Remove custom permissions (revert to role defaults)

### Available Permissions
- `can_view_members` - View member list
- `can_edit_members` - Edit member information
- `can_add_members` - Add new members
- `can_manage_membership` - Manage membership status
- `can_view_activities` - View activities
- `can_create_activities` - Create new activities
- `can_approve_activities` - Approve activities
- `can_view_financials` - View financial information
- `can_manage_financials` - Manage finances
- `can_send_group_messages` - Send messages to groups
- `can_manage_all_messages` - Manage all messages (superuser only)
- `can_view_statistics` - View statistics
- `can_export_data` - Export data
- `can_manage_end_reasons` - Manage membership end reasons
- `can_manage_card_numbers` - Manage member card numbers
- `can_assign_passwords` - Assign passwords to members

### Role Assignment
- **Assign Roles** - Change member roles (member, administrator, superuser)
- **Role Hierarchy** - Understand role permissions

---

## ⚙️ Organization Settings

### System Settings
- **Card Number Length** - Configure member card number format (4-8 digits)
- **Membership Renewal** - Set renewal dates and periods
- **Password Generation** - Configure password generation strategy
- **Time Zone** - Set organization time zone

### 2FA Configuration
- **PIN 2FA** - Enable/disable PIN-based 2FA
- **Trusted Devices** - Configure trusted device settings
- **2FA Requirements** - Set which roles require 2FA
- **OTP Settings** - Configure one-time password parameters

### Membership Settings
- **Termination Dates** - Configure automatic membership termination
- **Registration Limits** - Set registration rate limiting
- **Renewal Periods** - Define membership renewal cycles

---

## 🏃‍♂️ Activity Management

### Holiday Management
- **View Holidays** - See all organization holidays
- **Add Holidays** - Create custom holidays
- **Edit Holidays** - Modify existing holidays
- **Delete Holidays** - Remove holidays
- **Seed Default Holidays** - Add Croatian national holidays
- **Bulk Operations** - Manage holidays by year

### Duty Calendar Settings
- **Duty Configuration** - Configure duty calendar parameters
- **Holiday Integration** - Integrate holidays with duty calendar

---

## 🛡️ Security & Audit

### Audit Logs
- **Organization Logs** - All activities within your organization
- **Filter by Date** - View logs for specific time periods
- **Filter by Action** - View specific types of activities
- **Member Activity** - Track individual member actions
- **System Changes** - Monitor configuration changes

### Security Settings
- **2FA Management** - Configure two-factor authentication
- **Session Management** - Control session timeouts
- **Password Policies** - Set password requirements
- **Access Control** - Manage member access levels

---

## 🔧 Administrative Tools

### Member Registration
1. **Pending List** - View members awaiting activation
2. **Password Assignment** - Generate and assign passwords
3. **Card Number Assignment** - Assign member card numbers

### Data Management
- **Export Members** - Export member lists
- **Statistics** - View organization statistics

---

## 🚫 Limitations

### What OSM Cannot Do
- **Create Organizations** - Only Global SM can create new organizations
- **Access Other Organizations** - Limited to your organization only
- **Global Settings** - Cannot modify platform-wide settings
- **Create System Managers** - Cannot create SM for other organizations
- **Cross-Organization Operations** - No access to other organization data

### Global vs Organization Settings
- **Global Settings** - Managed by Global System Manager only
- **Organization Settings** - You can modify these for your organization
- **Inheritance** - Some settings inherit from global if not set locally

---

## ❓ Frequently Asked Questions

### How do I register new members?
1. Go to **Register Members** tab
2. View pending members list
3. Click **Assign Password** for each member
4. Optionally assign card numbers
5. Members can now log in with assigned credentials

### How do I change organization settings?
1. Go to **Settings** tab
2. Modify the desired settings
3. Click **Save Changes**
4. Changes apply immediately to your organization

### Can I see other organizations' data?
No, as an Organization System Manager, you can only access data for your specific organization.

### How do I manage member permissions?
1. Go to **Members** tab
2. Find the member and click **Edit**
3. Go to **Permissions** section
4. Enable/disable specific permissions
5. Save changes

### What's the difference between roles and permissions?
- **Roles** (member, administrator, superuser) provide default permission sets
- **Permissions** allow granular control over specific capabilities
- Custom permissions override role defaults

---

## 🆘 Support

### Technical Support
For technical issues or questions about OSM functionality, contact your Global System Manager or technical support team.

### Global System Manager
For organization-level changes that require Global SM privileges:
- Creating additional organizations
- Platform-wide configuration changes
- Cross-organization operations

---

## 🔗 Related Documentation

- **[API Reference](./api-reference.md)** - Technical API documentation
- **[Global SM Guide](../global-manager/gsm-guide.md)** - Global System Manager guide

---

*Last updated: October 25, 2025*
