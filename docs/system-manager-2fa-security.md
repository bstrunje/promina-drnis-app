# System Manager 2FA Security Implementation

## 📋 Pregled

Implementiran je kompletni sigurnosni sustav za System Manager-e s PIN 2FA, Trusted Devices i Force Password Change funkcionalnostima. Sustav razlikuje Global System Manager (GSM) i Organization System Manager (Org SM) s različitim razinama pristupa.

## 🎯 Implementirane Funkcionalnosti

### 🔐 Global System Manager (GSM) - organization_id: null

#### **Sigurnosni Slojevi:**
1. **Force Password Change** - obavezno pri prvom loginu
2. **PIN 2FA** - 4-digit PIN nakon login-a
3. **Trusted Devices** - "Zapamti uređaj" funkcionalnost (30 dana)
4. **Session Management** - JWT tokeni s refresh

#### **Funkcionalnosti:**
- ✅ **Settings stranica** - `/system-manager/settings`
- ✅ **Password Change** - trenutna + nova lozinka
- ✅ **2FA Management** - enable/disable PIN 2FA
- ✅ **Trusted Devices** - prikaz i uklanjanje
- ✅ **2FA kontrole za Org SM** - može upravljati 2FA za sve Org SM-ove

### 🏢 Organization System Manager (Org SM) - organization_id: 1,2,3...

#### **Funkcionalnosti:**
- ✅ **2FA kontrole** - vidljive u edit organizaciji
- ✅ **Enable/Disable 2FA** - funkcionira preko modal-a
- ✅ **PIN setup** - 4-digit PIN s potvrdom
- ✅ **GSM upravljanje** - Global SM može upravljati njihovim 2FA

## 🔧 Backend Implementacija

### **Novi Endpoint-i:**

```typescript
// PIN 2FA za System Manager
POST /api/system-manager/setup-2fa-pin
POST /api/system-manager/verify-2fa-pin
POST /api/system-manager/disable-2fa
GET  /api/system-manager/2fa-status

// 2FA upravljanje za druge System Manager-e (samo Global SM)
POST /api/system-manager/enable-2fa-for-user
POST /api/system-manager/disable-2fa-for-user

// Trusted devices
GET    /api/system-manager/trusted-devices
DELETE /api/system-manager/trusted-devices/:deviceId
```

### **Novi Modeli:**

```prisma
model SystemManagerTrustedDevice {
  id                    Int           @id @default(autoincrement())
  system_manager_id     Int
  device_hash           String        @db.VarChar(255)
  device_name           String?       @db.VarChar(100)
  expires_at            DateTime      @db.Timestamp(6)
  created_at            DateTime      @default(now()) @db.Timestamp(6)
  last_used_at          DateTime?     @db.Timestamp(6)
  
  system_manager        SystemManager @relation(fields: [system_manager_id], references: [id], onDelete: Cascade)
  
  @@unique([system_manager_id, device_hash])
  @@map("system_manager_trusted_devices")
}
```

### **Ažurirani SystemManager Model:**

```prisma
model SystemManager {
  // ... postojeća polja ...
  
  // 2FA polja
  two_factor_enabled        Boolean?     @default(false)
  two_factor_confirmed_at   DateTime?    @db.Timestamp(6)
  two_factor_secret         String?      @db.VarChar(255)
  two_factor_recovery_codes_hash Json?
  two_factor_preferred_channel String?   @db.VarChar(10)
  password_reset_required      Boolean      @default(false)
  
  // Trusted devices relacija
  trusted_devices SystemManagerTrustedDevice[]
}
```

## 🎨 Frontend Implementacija

### **Nove Komponente:**

1. **GlobalSystemManagerSettings.tsx**
   - Password change sekcija
   - 2FA management sekcija
   - Trusted devices sekcija

2. **OrganizationEdit.tsx** - ažuriran
   - System Manager Security sekcija
   - 2FA enable/disable modal
   - PIN setup funkcionalnost

### **Ažurirane Komponente:**

1. **ManagerTabNav.tsx**
   - "Security Settings" tab za GSM
   - Uvjetni prikaz ovisno o tipu managera

2. **SystemManagerDashboard.tsx**
   - Uvjetni prikaz GlobalSystemManagerSettings

3. **SystemManagerStep.tsx** (wizard)
   - 2FA kontrole tijekom kreiranja organizacije
   - PIN setup polja

## 🔐 Sigurnosni Flow

### **GSM Login Flow:**
```
1. Username/Password → 
2. Force Password Change (ako potrebno) → 
3. Trusted Device Check → 
4. PIN 2FA (ako enabled) → 
5. Dashboard
```

### **Org SM Login Flow:**
```
1. Username/Password → 
2. PIN 2FA (ako enabled) → 
3. Trusted Device (ako remember device) → 
4. Dashboard
```

### **2FA Setup Flow:**
```
1. GSM može postaviti 2FA za Org SM kroz edit organizacije
2. GSM može postaviti vlastiti 2FA kroz Settings
3. PIN se hashira s bcrypt prije spremanja
4. Trusted devices se identificiraju preko User-Agent + IP hash
```

## 📁 Datoteke

### **Backend:**
- `backend/src/controllers/systemManager.controller.ts` - 2FA endpoint-i
- `backend/src/utils/systemManagerTrustedDevices.ts` - Trusted devices logika
- `backend/src/repositories/systemManager.repository.ts` - update metoda
- `backend/src/routes/systemManager.ts` - nove rute
- `backend/prisma/schema.prisma` - SystemManagerTrustedDevice model

### **Frontend:**
- `frontend/src/features/systemManager/pages/settings/GlobalSystemManagerSettings.tsx`
- `frontend/src/features/systemManager/organizations/OrganizationEdit.tsx`
- `frontend/src/features/systemManager/organizations/steps/SystemManagerStep.tsx`
- `frontend/src/features/systemManager/components/common/ManagerTabNav.tsx`
- `frontend/src/features/systemManager/pages/dashboard/SystemManagerDashboard.tsx`
- `frontend/src/features/systemManager/SystemManagerRoutes.tsx`

### **API Tipovi:**
- `frontend/src/utils/api/apiOrganizations.ts` - ažurirani tipovi

## 🗄️ Database Migracije

```sql
-- Kreirana migracija: 20251022213001_add_system_manager_trusted_devices
CREATE TABLE "system_manager_trusted_devices" (
    "id" SERIAL NOT NULL,
    "system_manager_id" INTEGER NOT NULL,
    "device_hash" VARCHAR(255) NOT NULL,
    "device_name" VARCHAR(100),
    "expires_at" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(6),

    CONSTRAINT "system_manager_trusted_devices_pkey" PRIMARY KEY ("id")
);
```

## 🧪 Testiranje

### **Testni Scenariji:**

1. **GSM Force Password Change**
   - Seed postavlja `password_reset_required: true`
   - Prvi login zahtijeva promjenu lozinke

2. **GSM 2FA Setup**
   - Settings stranica omogućuje enable/disable
   - PIN se hashira i sprema sigurno

3. **Org SM 2FA Management**
   - GSM može upravljati 2FA za Org SM
   - Modal s PIN setup-om funkcionira

4. **Trusted Devices**
   - "Remember device" checkbox u 2FA
   - Uređaji se prikazuju u Settings
   - Uklanjanje uređaja funkcionira

## 🚀 Deployment

### **Potrebne Akcije:**
1. ✅ Prisma migracija primijenjena
2. ✅ Prisma client regeneriran
3. ✅ Seed ažuriran za GSM password reset
4. ✅ Lint greške riješene

### **Provjera:**
```bash
# Backend
npm run lint
npm run build

# Frontend  
npm run lint
npm run build
```

## 📊 Sigurnosne Mjere

### **Implementirane:**
- ✅ PIN hashing s bcrypt
- ✅ JWT tokeni s ograničenim vremenom
- ✅ Trusted devices s expiration
- ✅ Provjera vlasništva device-a
- ✅ Rate limiting kroz middleware
- ✅ Audit logging

### **Preporučene Dodatne:**
- [ ] PIN lockout nakon neuspješnih pokušaja
- [ ] Email notifikacije za 2FA promjene
- [ ] Backup recovery codes
- [ ] Session invalidation na 2FA disable

## 🎯 Zaključak

Implementiran je kompletni sigurnosni sustav za System Manager-e s jasnim razlikama između GSM i Org SM. Sustav pruža maksimalnu sigurnost uz jednostavnost korištenja kroz PIN 2FA i Trusted Devices funkcionalnosti.

**Status: ✅ KOMPLETNO IMPLEMENTIRANO**

---
*Dokumentacija kreirana: 23.10.2025*
*Verzija: 1.0*
