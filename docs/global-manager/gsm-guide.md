# Global System Manager Guide

**Role:** Global System Manager (GSM)  
**Access:** Cross-organization management  
**Language:** English

---

## 🎯 Overview

As a Global System Manager, you can create and manage multiple organizations on the platform. Each organization has its own Organization System Manager (OSM) who handles day-to-day operations.

**Key Distinction:** Your `organization_id` is `null`, which grants you access to manage all organizations.

---

## 🏢 Organization Management

### Creating a New Organization

**Route:** `POST /api/system-manager/organizations`

When creating an organization, you provide:

1. **Organization Details**:
   - `name` - Full organization name
   - `subdomain` - Unique subdomain (e.g., `promina`)
   - `email` - Organization contact email
   - `phone` - Contact phone number (optional)
   - `address` - Physical address (optional)

2. **Organization System Manager (OSM) Account**:
   - `sm_username` - OSM username
   - `sm_email` - OSM email
   - `sm_password` - Initial OSM password
   - `sm_display_name` - OSM display name (optional)

3. **Branding** (optional):
   - `primary_color` - Main brand color (hex)
   - `secondary_color` - Accent color (hex)

The system will:
- Create the organization
- Automatically create the OSM account
- Set `password_reset_required = true` for the OSM
- OSM must change password on first login

### Viewing Organizations

**Route:** `GET /api/system-manager/organizations`

Returns a list of all organizations with:
- Organization ID
- Name and subdomain
- Contact information
- Member count
- Created date
- OSM information

### Viewing Single Organization

**Route:** `GET /api/system-manager/organizations/:id`

Get detailed information about a specific organization.

### Updating Organization

**Route:** `PUT /api/system-manager/organizations/:id`

Update organization details:
- Name, email, phone, address
- Primary and secondary colors
- Other organization settings

### Deleting Organization

**Route:** `DELETE /api/system-manager/organizations/:id`

Permanently deletes an organization and all its data:
- All members
- All activities
- All messages
- All audit logs
- Organization System Manager account

**Warning:** This action cannot be undone.

---

## 🎨 Organization Branding

### Upload Organization Logo

**Route:** `POST /api/system-manager/organizations/:id/logo`

Upload a logo image for the organization (max 2MB, image files only).

### Delete Organization Logo

**Route:** `DELETE /api/system-manager/organizations/:id/logo`

Remove the organization's logo.

---

## 🔑 OSM Credential Management

### Reset OSM Password

**Route:** `POST /api/system-manager/organizations/:id/reset-credentials`

If an Organization System Manager loses access:
1. Reset their password
2. System generates a new temporary password
3. OSM must change password on next login
4. `password_reset_required` is set to `true`

---

## 🔍 Utilities

### Check Subdomain Availability

**Route:** `GET /api/system-manager/organizations/check-subdomain?subdomain=example`

Verify if a subdomain is available before creating an organization.

---

## 📊 System Overview dashboard

As a Global System Manager you also have access to a System Overview dashboard that aggregates key statistics across **all organizations**.

### Members card

- The **Members** card on the dashboard shows the **total number of active members** across all tenants.
- The number is calculated using the centralized membership status logic (current membership periods and activity), and **does not count inactive members**.
- The card no longer shows a textual breakdown below the number; it only displays the total.
- Clicking the Members card navigates you to the global members list.

### Global members list status filter

When you open the global members list as GSM:

- A **status filter** is available in the toolbar.
- Default setting hides inactive members (shows only non-inactive entries).
- You can switch between:
  - *All statuses* – shows all members regardless of status
  - *Active (non-inactive)* – shows only non-inactive members (default view)
  - *Inactive only* – shows only members that are currently inactive

This ensures that the dashboard Members card and the default global members list view both focus on currently active members, while still allowing you to inspect inactive records when needed.

---

## ❓ Frequently Asked Questions

### What is the difference between GSM and OSM?
- **GSM (Global System Manager)**: Manages multiple organizations, creates OSM accounts
- **OSM (Organization System Manager)**: Manages a single organization, handles members, settings, and daily operations

### Can I access organization settings?
No, organization-specific settings (2FA, holidays, duty calendar, etc.) are managed by each Organization System Manager.

### Can I manage members directly?
No, member management is handled by the Organization System Manager of each organization.

### What happens when I create an organization?
The system creates the organization and automatically creates an OSM account with the credentials you provide. The OSM will be required to change their password on first login.

### How do I help an OSM who forgot their password?
Use the "Reset OSM Password" function to generate a new temporary password for them.

---

## 📋 Summary of GSM Capabilities

### ✅ What GSM CAN do:
- Create new organizations (`POST /api/system-manager/organizations`)
- View all organizations (`GET /api/system-manager/organizations`)
- View organization details (`GET /api/system-manager/organizations/:id`)
- Update organization information (`PUT /api/system-manager/organizations/:id`)
- Delete organizations (`DELETE /api/system-manager/organizations/:id`)
- Upload/delete organization logos (`POST/DELETE /api/system-manager/organizations/:id/logo`)
- Reset OSM credentials (`POST /api/system-manager/organizations/:id/reset-credentials`)
- Check subdomain availability (`GET /api/system-manager/organizations/check-subdomain`)

### ❌ What GSM CANNOT do:
- Manage organization-specific settings (handled by OSM)
- Directly manage members (handled by OSM)
- Access organization audit logs (handled by OSM)
- Configure 2FA settings for organizations (handled by OSM)
- Manage holidays and duty calendars (handled by OSM)

---

## 🔗 Related Documentation

- **[OSM Guide](../organization-manager/osm-guide.md)** - Organization System Manager guide
- **[API Reference](./api-reference.md)** - Technical API documentation

---

*Last updated: October 25, 2025*
