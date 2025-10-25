# Organization System Manager API Reference

**For:** Organization System Manager (OSM)  
**Base URL:** `/api/system-manager`  
**Authentication:** JWT Token (SystemManager type)

---

## 🔐 Authentication

### POST /api/system-manager/login
Login as Organization System Manager.

**Request:**
```json
{
  "username": "osm_username",
  "password": "password123"
}
```

**Query Parameters:**
- `tenant` - Organization subdomain (optional, for multi-tenant)

**Response:**
```json
{
  "token": "jwt_access_token",
  "manager": {
    "id": 1,
    "username": "osm_username",
    "email": "osm@example.com",
    "display_name": "OSM Name",
    "role": "SystemManager",
    "organization_id": 1,
    "is_global": false,
    "last_login": "2025-10-25T10:00:00Z"
  }
}
```

**2FA Response (if enabled):**
```json
{
  "twoFactorRequired": true,
  "tempToken": "temporary_2fa_token"
}
```

### POST /api/system-manager/verify-2fa-pin
Verify PIN for 2FA login.

**Request:**
```json
{
  "pin": "123456",
  "tempToken": "temporary_2fa_token"
}
```

### POST /api/system-manager/refresh-token
Refresh access token using refresh token cookie.

**Response:**
```json
{
  "token": "new_jwt_access_token",
  "manager": { /* manager object */ }
}
```

### POST /api/system-manager/logout
Logout and clear cookies.

---

## 👥 Member Management

### GET /api/system-manager/members
Get all members in your organization.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
[
  {
    "member_id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "role": "member",
    "status": "active",
    "organization": {
      "id": 1,
      "name": "My Organization",
      "short_name": "MyOrg"
    }
  }
]
```

### GET /api/system-manager/pending-members
Get members awaiting password assignment.

**Response:**
```json
[
  {
    "member_id": 2,
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@example.com",
    "created_at": "2025-10-25T09:00:00Z"
  }
]
```

### POST /api/system-manager/assign-password
Assign password to pending member.

**Request:**
```json
{
  "memberId": 2,
  "password": "generated_password",
  "cardNumber": "12345"
}
```

**Response:**
```json
{
  "message": "Password assigned successfully"
}
```

### POST /api/system-manager/assign-role
Change member role.

**Request:**
```json
{
  "memberId": 1,
  "role": "member_administrator"
}
```

**Response:**
```json
{
  "message": "Role assigned successfully"
}
```

### DELETE /api/system-manager/members/:memberId
Delete a member from your organization.

**Response:**
```json
{
  "message": "Član uspješno obrisan",
  "memberId": 1
}
```

---

## 🎛️ Permission Management

### GET /api/system-manager/member-permissions/:memberId
Get permissions for a specific member.

**Response:**
```json
{
  "member_id": 1,
  "can_view_members": true,
  "can_edit_members": true,
  "can_add_members": false,
  "can_manage_membership": true,
  "can_view_activities": true,
  "can_create_activities": true,
  "can_approve_activities": false,
  "can_view_financials": true,
  "can_manage_financials": false,
  "can_send_group_messages": true,
  "can_manage_all_messages": false,
  "can_view_statistics": true,
  "can_export_data": true,
  "can_manage_end_reasons": true,
  "can_manage_card_numbers": true,
  "can_assign_passwords": true,
  "member": {
    "member_id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "role": "member_administrator"
  }
}
```

### POST /api/system-manager/update-permissions
Update member permissions.

**Request:**
```json
{
  "memberId": 1,
  "permissions": {
    "can_view_members": true,
    "can_edit_members": true,
    "can_add_members": true
  }
}
```

**Response:**
```json
{
  "message": "Permissions updated successfully"
}
```

### GET /api/system-manager/members-without-permissions
Get members without custom permissions.

**Response:**
```json
[
  {
    "member_id": 3,
    "first_name": "Bob",
    "last_name": "Johnson",
    "email": "bob@example.com",
    "role": "member"
  }
]
```

### DELETE /api/system-manager/member-permissions/:memberId
Remove custom permissions (revert to role defaults).

**Response:**
```json
{
  "message": "Permissions removed successfully"
}
```

---

## ⚙️ Organization Settings

### GET /api/system-manager/settings
Get organization settings.

**Query Parameters:**
- `tenant` - Organization subdomain (optional)

**Response:**
```json
{
  "id": "1",
  "cardNumberLength": 5,
  "renewalStartMonth": 11,
  "renewalStartDay": 1,
  "timeZone": "Europe/Zagreb",
  "membershipTerminationDay": 1,
  "membershipTerminationMonth": 3,
  "twoFactorGlobalEnabled": false,
  "twoFactorMembersEnabled": true,
  "twoFactorChannelPinEnabled": true,
  "twoFactorTrustedDevicesEnabled": true,
  "twoFactorOtpExpirySeconds": 300,
  "twoFactorRememberDeviceDays": 30,
  "passwordGenerationStrategy": "FULLNAME_ISK_CARD",
  "passwordSeparator": "-isk-",
  "passwordCardDigits": 4
}
```

### PUT /api/system-manager/settings
Update organization settings.

**Request:**
```json
{
  "cardNumberLength": 6,
  "twoFactorMembersEnabled": true,
  "twoFactorChannelPinEnabled": true,
  "passwordGenerationStrategy": "RANDOM_8"
}
```

**Response:**
```json
{
  "id": "1",
  "cardNumberLength": 6,
  /* updated settings */
}
```

**Note:** Global System Manager cannot modify organization-specific settings.

---

## 📅 Holiday Management

### GET /api/system-manager/holidays
Get all holidays for your organization.

**Query Parameters:**
- `tenant` - Organization subdomain (required)

**Response:**
```json
[
  {
    "id": 1,
    "name": "Nova godina",
    "date": "2025-01-01",
    "is_recurring": true,
    "organization_id": 1
  }
]
```

### GET /api/system-manager/holidays/:year
Get holidays for specific year.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Nova godina",
    "date": "2025-01-01",
    "is_recurring": true
  }
]
```

### POST /api/system-manager/holidays
Create a new holiday.

**Request:**
```json
{
  "name": "Organization Day",
  "date": "2025-06-15",
  "is_recurring": true
}
```

**Response:**
```json
{
  "id": 10,
  "name": "Organization Day",
  "date": "2025-06-15",
  "is_recurring": true,
  "organization_id": 1
}
```

### PUT /api/system-manager/holidays/:id
Update a holiday.

**Request:**
```json
{
  "name": "Updated Holiday Name",
  "date": "2025-06-16"
}
```

### DELETE /api/system-manager/holidays/:id
Delete a holiday.

### POST /api/system-manager/holidays/seed
Seed default Croatian holidays for a year.

**Request:**
```json
{
  "year": 2025
}
```

### DELETE /api/system-manager/holidays/year/:year
Delete all holidays for a specific year.

---

## 🎛️ Duty Calendar Settings

### GET /api/system-manager/duty-settings
Get duty calendar settings.

**Response:**
```json
{
  "autoGroupWeekend": true,
  "groupRangeDays": 2,
  "enableSmartGrouping": true
}
```

### PUT /api/system-manager/duty-settings
Update duty calendar settings.

**Request:**
```json
{
  "autoGroupWeekend": true,
  "groupRangeDays": 3,
  "enableSmartGrouping": true
}
```

---

## 📊 Dashboard & Statistics

### GET /api/system-manager/dashboard/stats
Get dashboard statistics for your organization.

**Response:**
```json
{
  "totalMembers": 150,
  "activeMembers": 120,
  "totalActivities": 45,
  "recentActivities": 12,
  "totalAuditLogs": 1500,
  "pendingRegistrations": 5,
  "systemHealth": "Healthy",
  "lastBackup": "2025-10-25T02:00:00Z",
  "healthDetails": {
    "status": "Healthy",
    "dbConnection": true,
    "diskSpace": { /* disk info */ },
    "memory": { /* memory info */ },
    "uptime": 1234567,
    "lastCheck": "2025-10-25T10:00:00Z"
  }
}
```

---

## 🛡️ Audit Logs

### GET /api/system-manager/audit-logs
Get audit logs for your organization.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)

**Response:**
```json
{
  "logs": [
    {
      "id": 1,
      "action": "login",
      "performer_id": 1,
      "performer_type": "MEMBER",
      "description": "Member logged in",
      "status": "success",
      "created_at": "2025-10-25T10:00:00Z",
      "affected": {
        "member_id": 1,
        "first_name": "John",
        "last_name": "Doe"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1500,
    "totalPages": 30
  }
}
```

---

## 🔐 2FA Management

### POST /api/system-manager/setup-2fa-pin
Setup PIN 2FA for your account.

**Request:**
```json
{
  "pin": "123456"
}
```

**Response:**
```json
{
  "message": "PIN 2FA successfully enabled"
}
```

### POST /api/system-manager/disable-2fa
Disable 2FA for your account.

**Response:**
```json
{
  "message": "2FA disabled successfully"
}
```

### GET /api/system-manager/2fa-status
Get 2FA status for your account.

**Response:**
```json
{
  "enabled": true,
  "method": "pin",
  "confirmedAt": "2025-10-25T09:00:00Z"
}
```

### GET /api/system-manager/trusted-devices
Get list of trusted devices.

**Response:**
```json
[
  {
    "id": 1,
    "device_name": "Chrome on Windows",
    "last_used": "2025-10-25T10:00:00Z",
    "expires_at": "2025-11-24T10:00:00Z"
  }
]
```

### DELETE /api/system-manager/trusted-devices/:deviceId
Remove a trusted device.

---

## 🔧 Account Management

### PATCH /api/system-manager/change-password
Change your password.

**Request:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

**Response:**
```json
{
  "message": "Password changed successfully"
}
```

### PATCH /api/system-manager/change-username
Change your username.

**Request:**
```json
{
  "newUsername": "new_username"
}
```

**Response:**
```json
{
  "message": "Username changed successfully",
  "username": "new_username"
}
```

---

## 🚫 Error Responses

### Standard Error Format
```json
{
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

### Common Error Codes
- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `400` - Bad Request (invalid input)
- `500` - Internal Server Error

### OSM-Specific Errors
- `Global System Manager cannot access organization-specific settings`
- `Access denied. You can only access your own organization.`
- `Only Global System Managers can manage organization settings`

---

## 📝 Notes

### Multi-Tenancy
- All requests automatically filter by your organization
- Cannot access data from other organizations
- Use `tenant` query parameter for explicit organization selection

### Rate Limiting
- Login: 5 attempts per 15 minutes
- API calls: Standard rate limits apply
- 2FA verification: 3 attempts then lockout

### Pagination
Standard pagination parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

---

*Last updated: October 25, 2025*
