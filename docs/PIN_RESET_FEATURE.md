# PIN Reset Funkcionalnost

## 📋 Pregled

Potpuna PIN reset funkcionalnost za članove i System Manager-e s automatskim generiranjem sigurnih PIN-ova i prisilnom promjenom pri sljedećoj prijavi.

---

## 🎯 Funkcionalnosti

### **Za Članove:**
- ✅ OSM može resetirati PIN bilo kojem članu u svojoj organizaciji
- ✅ GSM može resetirati PIN bilo kojem članu u bilo kojoj organizaciji
- ✅ Superuser može resetirati PIN bilo kojem članu
- ✅ Auto-generiranje sigurnog 6-znamenkastog PIN-a ili custom PIN
- ✅ Prisilna promjena PIN-a pri sljedećoj prijavi

### **Za System Manager-e:**
- ✅ GSM može resetirati PIN bilo kojem OSM-u
- ✅ Auto-generiranje sigurnog 6-znamenkastog PIN-a ili custom PIN
- ✅ Prisilna promjena PIN-a pri sljedećoj prijavi

---

## 🔐 Sigurnosne Mjere

1. **PIN Hashiranje**: bcrypt s 12 rounds
2. **Audit Logging**: Sve reset akcije se bilježe
3. **Prisilna Promjena**: `pin_reset_required` flag se postavlja na `true`
4. **Rate Limiting**: Postojeći mehanizam (3 pokušaja, 15 min lockout)
5. **Validacija PIN-a**: 
   - 6 znamenki
   - Nije dopušteno ponavljanje (npr. 111111)
   - Nije dopuštena sekvenca (npr. 123456)

---

## 📡 API Endpoint-i

### **Reset PIN za člana**
```
POST /api/members/:memberId/reset-pin
Authorization: Bearer <token> (OSM/GSM/Superuser)

Request Body:
{
  "newPin": "123456" // Opcionalno - ako nije poslano, generira se random PIN
}

Response:
{
  "message": "PIN successfully reset",
  "memberName": "Ime Prezime",
  "newPin": "789456", // Vraća se samo ako je auto-generiran
  "mustChangePin": true
}
```

### **Reset PIN za System Manager-a**
```
POST /api/system-manager/reset-osm-pin
Authorization: Bearer <token> (samo GSM)

Request Body:
{
  "systemManagerId": 5,
  "newPin": "123456" // Opcionalno
}

Response:
{
  "message": "PIN successfully reset for System Manager",
  "managerName": "Display Name",
  "newPin": "789456", // Vraća se samo ako je auto-generiran
  "mustChangePin": true
}
```

### **Promjena vlastitog PIN-a (Member)**
```
POST /api/members/:memberId/set-pin
Authorization: Bearer <token>

Request Body:
{
  "currentPin": "123456", // Potreban ako PIN već postoji
  "newPin": "654321"
}

Response:
{
  "message": "PIN successfully changed"
}
```

### **Promjena vlastitog PIN-a (System Manager)**
```
POST /api/system-manager/change-pin
Authorization: Bearer <token>

Request Body:
{
  "currentPin": "123456",
  "newPin": "654321"
}

Response:
{
  "message": "PIN successfully changed"
}
```

### **Promjena PIN-a nakon reseta (Member)**
```
POST /api/auth/change-pin-after-reset
Authorization: None (public endpoint)

Request Body:
{
  "memberId": 123,
  "currentPin": "123456", // Resetirani PIN
  "newPin": "654321"      // Novi PIN
}

Response:
{
  "message": "PIN successfully changed",
  "token": "access_token",
  "member": {
    "member_id": 123,
    "first_name": "Ime",
    "last_name": "Prezime",
    "email": "email@example.com",
    "role": "member",
    "organization_id": 1
  }
}
```

### **Promjena PIN-a nakon reseta (System Manager)**
```
POST /api/system-manager/change-pin-after-reset
Authorization: Bearer <tempToken> (scope: 'pin-reset')

Request Body:
{
  "managerId": 5,
  "currentPin": "123456", // Resetirani PIN
  "newPin": "654321",     // Novi PIN
  "tempToken": "jwt_token"
}

Response:
{
  "message": "PIN changed successfully",
  "token": "new_access_token",
  "refreshToken": "new_refresh_token",
  "manager": { /* System Manager podaci */ }
}
```

---

## 🖥️ Frontend Komponente

### **ResetPinModal**
Lokacija: `frontend/src/features/systemManager/components/modals/ResetPinModal.tsx`

**Props:**
```typescript
interface ResetPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: number;
  targetName: string;
  targetType: 'member' | 'osm';
  onSuccess?: () => void;
}
```

**Funkcionalnosti:**
- Auto-generate ili custom PIN opcija
- Prikaz generiranog PIN-a s show/hide toggle
- Upozorenja i sigurnosne napomene
- Success state s instrukcijama
- Error handling
- Loading states

### **ForcePinChangeModal**
Lokacija: `frontend/src/components/ForcePinChangeModal.tsx`

**Props:**
```typescript
interface ForcePinChangeModalProps {
  isOpen: boolean;
  memberId: number;
  memberName?: string;
  onSuccess: () => void;
  onCancel: () => void;
}
```

**Funkcionalnosti:**
- Modal forma za promjenu PIN-a nakon reseta (za članove)
- Validacija novog PIN-a (6 znamenki, ne ponavlja se, ne sekvenca)
- Automatski sprema token i member podatke u localStorage
- Poziva `onSuccess` callback nakon uspješne promjene
- Security tips i upozorenja

### **SystemManagerChangePinPage**
Lokacija: `frontend/src/features/systemManager/pages/changePinPage/SystemManagerChangePinPage.tsx`

**Funkcionalnosti:**
- Forma za promjenu PIN-a nakon reseta (za System Manager-e)
- Prima `tempToken`, `managerId`, `managerName` iz location.state
- Validacija novog PIN-a (6 znamenki, ne ponavlja se)
- Automatski login nakon uspješne promjene PIN-a
- Redirect na dashboard s punim reload-om

### **Integracija u SystemManagerMembersView**
- Shield ikona (🛡️) pored Delete ikone
- Klik otvara ResetPinModal
- Automatski refresh liste nakon uspješnog reseta

---

## 🔄 Flow Prisilne Promjene PIN-a

### **Za Članove:**
1. **Admin/OSM resetira PIN članu**
2. **Backend postavlja** `pin_reset_required = true`
3. **Član se logira** s username/password
4. **Backend provjerava** `pin_reset_required` **PRIJE** traženja PIN-a
5. **Backend vraća** `PIN_RESET_REQUIRED` status (bez traženja PIN-a)
6. **Frontend prikazuje** `ForcePinChangeModal`
7. **Član unosi** resetirani PIN i postavlja novi PIN
8. **Backend resetira** `pin_reset_required = false` i vraća token
9. **Frontend automatski logira** korisnika i preusmjeri na dashboard

### **Za System Manager-e:**
1. **GSM resetira PIN OSM-u**
2. **Backend postavlja** `pin_reset_required = true`
3. **OSM se logira** s username/password
4. **Backend traži** 2FA kod
5. **OSM unosi** 2FA kod
6. **Backend detektira** `pin_reset_required = true`
7. **Frontend preusmjeri** na `SystemManagerChangePinPage`
8. **OSM unosi** resetirani PIN i postavlja novi PIN
9. **Backend resetira** `pin_reset_required = false` i vraća token
10. **Frontend automatski logira** OSM-a i preusmjeri na dashboard

---

## 🗄️ Database Schema Promjene

### **Member Model:**
```prisma
pin_hash                String?   @db.VarChar(255)
pin_attempts            Int       @default(0)
pin_locked_until        DateTime? @db.Timestamp(6)
pin_set_at              DateTime? @db.Timestamp(6)
pin_reset_required      Boolean   @default(false) // ✨ NOVO
```

### **SystemManager Model:**
```prisma
pin_hash                String?   @db.VarChar(255)  // ✨ NOVO
pin_attempts            Int       @default(0)        // ✨ NOVO
pin_locked_until        DateTime? @db.Timestamp(6)  // ✨ NOVO
pin_set_at              DateTime? @db.Timestamp(6)  // ✨ NOVO
pin_reset_required      Boolean   @default(false)   // ✨ NOVO
```

**Migracija:**
```
20251111000232_add_pin_reset_required_and_system_manager_pin_fields
```

---

## 🧪 Testiranje

### **1. Reset PIN za člana (auto-generate)**
1. Logiraj se kao OSM ili GSM
2. Idi na Members View
3. Klikni Shield ikonu (🛡️) za nekog člana
4. NE označavaj "Set custom PIN"
5. Klikni "Reset PIN"
6. Prikaže se generirani PIN (npr. "789456")
7. Zapiši PIN
8. Probaj se logirati kao taj član s novim PIN-om
9. Treba tražiti promjenu PIN-a

### **2. Reset PIN za člana (custom)**
1. Logiraj se kao OSM ili GSM
2. Idi na Members View
3. Klikni Shield ikonu (🛡️) za nekog člana
4. Označi "Set custom PIN"
5. Unesi custom PIN (npr. "567890")
6. Klikni "Reset PIN"
7. Probaj se logirati kao taj član s custom PIN-om
8. Treba tražiti promjenu PIN-a

### **3. Prisilna promjena PIN-a (Član)**
1. Nakon reseta, logiraj se kao član čiji je PIN resetiran
2. Unesi username/password (NE traži se PIN!)
3. Automatski se prikazuje `ForcePinChangeModal`
4. Unesi resetirani PIN u "Current PIN" polje
5. Unesi novi PIN (6 znamenki)
6. Potvrdi novi PIN
7. Klikni "Change PIN & Continue"
8. Automatski se logiraš i preusmjeriš na dashboard

### **4. Prisilna promjena PIN-a (System Manager)**
1. Nakon reseta, logiraj se kao OSM čiji je PIN resetiran
2. Unesi username/password
3. Unesi resetirani PIN
4. System Manager prepoznaje `pinResetRequired: true`
5. **Frontend prikazuje SystemManagerChangePinPage formu**
6. OSM unosi novi PIN
7. Nakon uspješne promjene, automatski se logira i preusmjeri na dashboard

### **5. Audit Log provjera**
1. Logiraj se kao GSM
2. Idi na Audit Logs
3. Filtriraj po "RESET_MEMBER_PIN"
4. Provjeri da se vidi tko je izvršio reset i za kojeg člana

---

## 🎯 GSM Reset OSM PIN UI

**Lokacija:** Organization Edit → System Manager Security sekcija

**Kako funkcionira:**
1. GSM otvara Organization Edit stranicu
2. Ako OSM ima PIN 2FA omogućen, prikazuje se "Reset PIN" gumb
3. Klik na gumb otvara ResetPinModal
4. Auto-generate ili custom PIN opcija
5. PIN se resetira, OSM mora promijeniti pri sljedećoj prijavi

**Implementirano u:**
- `frontend/src/features/systemManager/organizations/OrganizationEdit.tsx`
- Koristi postojeću `ResetPinModal` komponentu

---

## 🔒 Multi-Tenancy Compliance

### **Backend:**

**Member PIN Reset** (`resetMemberPin` u `pinController.ts`):
```typescript
// OSM može resetirati PIN samo članovima iz svoje organizacije
if (systemManager?.organization_id !== null && 
    systemManager?.organization_id !== member.organization_id) {
  res.status(403).json({ message: 'You can only reset PINs for members in your organization' });
  return;
}
```

**System Manager PIN Reset** (`resetSystemManagerPin` u `systemManager.controller.ts`):
```typescript
// Samo GSM (organization_id === null) može resetirati PIN drugim OSM-ovima
if (currentManager.organization_id !== null) {
  res.status(403).json({ message: 'Only Global System Manager can reset PINs for other managers' });
  return;
}
```

### **Frontend:**

**SystemManagerMembersView.tsx:**
```typescript
const canResetPin = (member: Member): boolean => {
  // GSM može resetirati PIN svima
  if (isGlobalManager) return true;
  
  // OSM može resetirati PIN samo članovima iz svoje organizacije
  return member.organization?.id === manager?.organization_id;
};
```

**OrganizationEdit.tsx:**
```typescript
// Reset PIN gumb se prikazuje samo ako je GSM
{currentManager?.organization_id === null && organization?.system_manager && (
  <div className="pt-6 border-t">
    <h3 className="text-lg font-semibold mb-4">System Manager Security</h3>
    ...
  </div>
)}
```

---

## ⚠️ Poznata Ograničenja

**Email notifikacije nisu implementirane:**
- Parametri `notifyMember` i `notifyManager` su uklonjeni
- Admin mora ručno komunicirati novi PIN korisniku

---

## 📝 TODO za Buduće Verzije

- [x] ~~Frontend modal za prisilnu promjenu PIN-a pri login-u~~ **IMPLEMENTIRANO** ✅
- [x] ~~System Manager PIN change forma~~ **IMPLEMENTIRANO** ✅
- [x] ~~Rate limiting za PIN reset akcije (sprječavanje abuse-a)~~ **IMPLEMENTIRANO** ✅
- [x] ~~Multi-tenancy compliance checks~~ **IMPLEMENTIRANO** ✅
- [x] ~~GSM Reset OSM PIN UI~~ **IMPLEMENTIRANO** ✅
- [x] ~~Frontend forma za prisilnu promjenu PIN-a za članove~~ **IMPLEMENTIRANO** ✅
- [x] ~~Automatski login nakon promjene PIN-a~~ **IMPLEMENTIRANO** ✅
- [x] ~~Provjera pin_reset_required PRIJE traženja PIN-a~~ **IMPLEMENTIRANO** ✅
- [ ] Email notifikacije s novim PIN-om
- [ ] SMS notifikacije (opcionalno)
- [ ] Povijest PIN resetova u Audit Log-u (već postoji u AuditLog tablici)
- [ ] Integration testing
- [ ] E2E testing (Playwright)

---

## 👥 Autorizacija Matrica

| Akcija | Member | Admin | Superuser | OSM | GSM |
|--------|--------|-------|-----------|-----|-----|
| Reset PIN članu (vlastita org) | ❌ | ❌ | ✅ | ✅ | ✅ |
| Reset PIN članu (druga org) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Reset PIN OSM-u | ❌ | ❌ | ❌ | ❌ | ✅ |
| Promjena vlastitog PIN-a | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🔗 Povezane Datoteke

### Backend:
- `backend/src/controllers/members/pinController.ts`
- `backend/src/controllers/systemManager.controller.ts`
- `backend/src/controllers/auth/changePinAfterReset.handler.ts`
- `backend/src/controllers/systemManager/changePinAfterReset.handler.ts`
- `backend/src/routes/auth.ts`
- `backend/src/routes/members.ts`
- `backend/src/routes/systemManager.ts`
- `backend/src/controllers/auth/login.handler.ts`
- `backend/prisma/schema.prisma`

### Frontend:
- `frontend/src/components/ForcePinChangeModal.tsx`
- `frontend/src/features/auth/LoginPage.tsx`
- `frontend/src/features/systemManager/components/modals/ResetPinModal.tsx`
- `frontend/src/features/systemManager/components/members/SystemManagerMembersView.tsx`
- `frontend/src/features/systemManager/pages/changePinPage/SystemManagerChangePinPage.tsx`
- `frontend/src/features/systemManager/pages/login/SystemManagerLoginPage.tsx`
- `frontend/src/features/systemManager/pages/login/TwoFactorEntryPage.tsx`
- `frontend/src/features/systemManager/utils/systemManagerApi.ts`

### Dokumentacija:
- `docs/PIN_RESET_FEATURE.md` (ova datoteka)

---

**Verzija:** 1.2  
**Datum:** 11.11.2025  
**Autor:** AI Assistant (Cascade)  
**Ažurirano:** 
- Dodana `ForcePinChangeModal` komponenta za članove
- Dodana `/api/auth/change-pin-after-reset` endpoint dokumentacija
- Ažuriran member PIN reset flow (provjera `pin_reset_required` PRIJE traženja PIN-a)
- Dodana automatska registracija u AuthContext nakon promjene PIN-a
- Ažurirani testni scenariji i TODO lista
