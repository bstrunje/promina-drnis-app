# Global System Manager API Reference

**For:** Global System Manager (GSM)  
**Base URL:** `/api/system-manager`  
**Authentication:** JWT Token (SystemManager type with organization_id = null)

---

## 🔐 Authentication

### POST /api/system-manager/login
Login as Global System Manager.

**Request:**
```json
{
  "username": "gsm_username",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt_access_token",
  "manager": {
    "id": 1,
    "username": "gsm_username",
    "email": "gsm@platform.com",
    "display_name": "Global Admin",
    "role": "SystemManager",
    "organization_id": null,
    "is_global": true,
    "last_login": "2025-10-25T10:00:00Z"
  }
}
```

**Note:** `organization_id: null` indicates Global System Manager.

---

## 🏢 Organization Management

### GET /api/system-manager/organizations
Get all organizations on the platform.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
[
  {
    "id": 1,
    "name": "Organization One",
    "short_name": "Org1",
    "subdomain": "org1",
    "email": "contact@org1.com",
    "phone": "+385 1 234 5678",
    "address": "Address 1",
    "logo_url": "/uploads/org1/logo.png",
    "primary_color": "#FF5733",
    "secondary_color": "#33FF57",
    "status": "active",
    "created_at": "2025-01-01T00:00:00Z",
    "member_count": 150
  }
]
```

### GET /api/system-manager/organizations/:id
Get specific organization details.

**Response:**
```json
{
  "id": 1,
  "name": "Organization One",
  "short_name": "Org1",
  "subdomain": "org1",
  "email": "contact@org1.com",
  "phone": "+385 1 234 5678",
  "address": "Address 1",
  "logo_url": "/uploads/org1/logo.png",
  "primary_color": "#FF5733",
  "secondary_color": "#33FF57",
  "favicon_url": "/uploads/org1/favicon.ico",
  "status": "active",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-10-25T10:00:00Z",
  "settings": {
    "cardNumberLength": 5,
    "timeZone": "Europe/Zagreb"
  },
  "statistics": {
    "total_members": 150,
    "active_members": 120,
    "total_activities": 45
  }
}
```

### POST /api/system-manager/organizations
Create a new organization.

**Request:**
```json
{
  "name": "New Organization",
  "short_name": "NewOrg",
  "subdomain": "neworg",
  "email": "contact@neworg.com",
  "phone": "+385 1 234 5678",
  "address": "New Address",
  "primary_color": "#FF5733",
  "secondary_color": "#33FF57",
  "osm": {
    "username": "osm_neworg",
    "email": "osm@neworg.com",
    "display_name": "OSM Name",
    "password": "temporary_password"
  }
}
```

**Response:**
```json
{
  "organization": {
    "id": 2,
    "name": "New Organization",
    "subdomain": "neworg",
    "status": "active"
  },
  "osm": {
    "id": 5,
    "username": "osm_neworg",
    "email": "osm@neworg.com",
    "password_reset_required": true
  }
}
```

### PUT /api/system-manager/organizations/:id
Update organization details.

**Request:**
```json
{
  "name": "Updated Organization Name",
  "email": "newemail@org.com",
  "primary_color": "#0000FF"
}
```

### DELETE /api/system-manager/organizations/:id
Delete an organization permanently.

**Warning:** This action cannot be undone!

**Response:**
```json
{
  "message": "Organization deleted successfully",
  "backup_created": true,
  "backup_location": "/backups/org1_final_2025-10-25.sql"
}
```

### PATCH /api/system-manager/organizations/:id/status
Change organization status.

**Request:**
```json
{
  "status": "suspended",
  "reason": "Policy violation"
}
```

**Status values:** `active`, `inactive`, `suspended`

---

## 👥 Cross-Organization Member Access

### GET /api/system-manager/all-members
Get members from all organizations.

**Query Parameters:**
- `organization_id` - Filter by organization (optional)
- `status` - Filter by status (optional)
- `role` - Filter by role (optional)
- `page` - Page number
- `limit` - Items per page

**Response:**
```json
{
  "members": [
    {
      "member_id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "role": "member",
      "status": "active",
      "organization": {
        "id": 1,
        "name": "Organization One",
        "subdomain": "org1"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "totalPages": 25
  }
}
```

### GET /api/system-manager/organizations/:orgId/members
Get members for specific organization.

**Response:**
```json
[
  {
    "member_id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "role": "member_administrator",
    "status": "active"
  }
]
```

---

## 🎛️ Organization System Manager Management

### GET /api/system-manager/organizations/:orgId/managers
Get System Managers for an organization.

**Response:**
```json
[
  {
    "id": 5,
    "username": "osm_org1",
    "email": "osm@org1.com",
    "display_name": "OSM Name",
    "last_login": "2025-10-25T09:00:00Z",
    "two_factor_enabled": true,
    "password_reset_required": false,
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

### POST /api/system-manager/organizations/:orgId/managers
Create new Organization System Manager.

**Request:**
```json
{
  "username": "new_osm",
  "email": "newosm@org.com",
  "display_name": "New OSM",
  "password": "temporary_password"
}
```

### POST /api/system-manager/reset-organization-manager-credentials
Reset OSM credentials.

**Request:**
```json
{
  "organizationId": 1
}
```

**Response:**
```json
{
  "message": "Credentials reset successfully",
  "temporary_password": "manager123",
  "password_reset_required": true
}
```

### POST /api/system-manager/enable-2fa-for-user
Enable 2FA for specific OSM.

**Request:**
```json
{
  "managerId": 5,
  "method": "pin"
}
```

### POST /api/system-manager/disable-2fa-for-user
Disable 2FA for specific OSM.

**Request:**
```json
{
  "managerId": 5
}
```

---

## 📊 Platform Statistics

### GET /api/system-manager/platform/stats
Get platform-wide statistics.

**Response:**
```json
{
  "organizations": {
    "total": 10,
    "active": 8,
    "suspended": 2
  },
  "members": {
    "total": 1500,
    "active": 1200,
    "new_this_month": 50
  },
  "activities": {
    "total": 450,
    "this_month": 45
  },
  "system": {
    "uptime": 99.9,
    "disk_usage": 65.5,
    "memory_usage": 72.3,
    "cpu_usage": 45.2
  }
}
```

### GET /api/system-manager/dashboard/stats
Get GSM dashboard statistics.

**Response:**
```json
{
  "totalMembers": 1500,
  "activeMembers": 1200,
  "totalActivities": 450,
  "recentActivities": 45,
  "totalAuditLogs": 15000,
  "pendingRegistrations": 25,
  "systemHealth": "Healthy",
  "lastBackup": "2025-10-25T02:00:00Z",
  "healthDetails": {
    "status": "Healthy",
    "dbConnection": true,
    "diskSpace": {
      "available": 107374182400,
      "total": 274877906944,
      "percentUsed": 60
    },
    "memory": {
      "available": 4294967296,
      "total": 17179869184,
      "percentUsed": 75
    },
    "uptime": 1234567
  }
}
```

---

## 🛡️ Audit Logs

### GET /api/system-manager/audit-logs
Get audit logs across all organizations.

**Query Parameters:**
- `organization_id` - Filter by organization (optional)
- `action` - Filter by action type (optional)
- `performer_type` - MEMBER, SYSTEM_MANAGER (optional)
- `page` - Page number
- `limit` - Items per page

**Response:**
```json
{
  "logs": [
    {
      "id": 1,
      "action": "create_organization",
      "performer_id": 1,
      "performer_type": "SYSTEM_MANAGER",
      "description": "Created organization: New Org",
      "status": "success",
      "organization_id": 2,
      "created_at": "2025-10-25T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 15000,
    "totalPages": 300
  }
}
```

---

## ⚙️ Global Settings

### GET /api/system-manager/global-settings
Get global platform settings.

**Response:**
```json
{
  "platform": {
    "name": "Platform Name",
    "default_language": "hr",
    "default_timezone": "Europe/Zagreb"
  },
  "security": {
    "password_min_length": 8,
    "password_require_uppercase": true,
    "password_require_numbers": true,
    "session_timeout_minutes": 30,
    "max_login_attempts": 5
  },
  "2fa": {
    "global_enforcement": false,
    "available_methods": ["pin", "totp", "email"],
    "trusted_devices_enabled": true,
    "remember_device_days": 30
  }
}
```

### PUT /api/system-manager/global-settings
Update global platform settings.

**Request:**
```json
{
  "security": {
    "password_min_length": 10,
    "session_timeout_minutes": 60
  },
  "2fa": {
    "trusted_devices_enabled": true
  }
}
```

---

## 🔐 Trusted Devices Management

### GET /api/system-manager/organizations/:orgId/trusted-devices-settings
Get trusted devices settings for organization.

**Response:**
```json
{
  "enabled": true
}
```

### PUT /api/system-manager/organizations/:orgId/trusted-devices-settings
Update trusted devices settings for organization.

**Request:**
```json
{
  "enabled": true
}
```

**Note:** Only GSM can modify organization trusted device settings.

---

## 💾 Backup Management

### GET /api/system-manager/backups
Get list of available backups.

**Response:**
```json
[
  {
    "id": 1,
    "filename": "backup_2025-10-25_02-00.sql",
    "size": 524288000,
    "created_at": "2025-10-25T02:00:00Z",
    "type": "full",
    "status": "completed"
  }
]
```

### POST /api/system-manager/backups/create
Create manual backup.

**Request:**
```json
{
  "type": "full",
  "name": "pre_update_backup"
}
```

### POST /api/system-manager/backups/:id/restore
Restore from backup.

**Request:**
```json
{
  "confirm": true,
  "organization_id": 1
}
```

**Note:** If `organization_id` is provided, only that organization is restored.

---

## 🔧 System Maintenance

### POST /api/system-manager/maintenance/enable
Enable maintenance mode.

**Request:**
```json
{
  "message": "System maintenance in progress",
  "estimated_duration_minutes": 30
}
```

### POST /api/system-manager/maintenance/disable
Disable maintenance mode.

### GET /api/system-manager/system-health
Get detailed system health information.

**Response:**
```json
{
  "status": "healthy",
  "database": {
    "status": "connected",
    "response_time_ms": 15,
    "active_connections": 25
  },
  "storage": {
    "total_gb": 256,
    "used_gb": 154,
    "available_gb": 102,
    "percent_used": 60
  },
  "memory": {
    "total_gb": 16,
    "used_gb": 12,
    "available_gb": 4,
    "percent_used": 75
  },
  "cpu": {
    "cores": 8,
    "usage_percent": 45
  }
}
```

---

## 🚫 Error Responses

### GSM-Specific Errors
```json
{
  "message": "Only Global System Managers can perform this action",
  "code": "FORBIDDEN_GSM_ONLY"
}
```

```json
{
  "message": "Organization not found",
  "code": "ORGANIZATION_NOT_FOUND"
}
```

```json
{
  "message": "Subdomain already exists",
  "code": "SUBDOMAIN_CONFLICT"
}
```

---

## 📝 Notes

### Global Access
- GSM has `organization_id: null`
- Can access all organizations
- Can view cross-organization data
- Cannot modify organization-specific settings (OSM does that)

### Security
- All GSM actions are logged in audit trail
- Critical operations require confirmation
- Backup created before destructive operations

### Rate Limiting
- Higher rate limits for GSM
- Some operations have no rate limits
- Backup/restore operations are throttled

---

*Last updated: October 25, 2025*
