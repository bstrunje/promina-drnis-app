# Members API Reference

**Verzija:** 2025-10-25  
**Bazni URL:** `/api`

---

## 🔐 Autentifikacija

Svi API pozivi zahtijevaju JWT token u Authorization header-u:
```
Authorization: Bearer {jwt_token}
```

Dodatno, za PIN 2FA sustav:
```json
{
  "username": "korisnicko_ime",
  "password": "lozinka",
  "pin": "123456"
}
```

---

## 👤 Member Endpoints

### Osnovni pristup (svi članovi)

#### GET /api/members/profile
Dohvaća profil trenutno prijavljenog člana.

**Odgovor:**
```json
{
  "member_id": 1,
  "first_name": "Ivo",
  "last_name": "Ivić",
  "email": "ivo@example.com",
  "role": "member",
  "status": "registered"
}
```

#### PUT /api/members/profile-image
Upload profilne slike.

**Zahtjev:** Multipart form data s image datotekom
**Ograničenja:** JPG, PNG, max 5MB

---

## 🔧 Administrator Endpoints

### Upravljanje članovima

#### GET /api/members
Dohvaća sve članove organizacije.

**Dozvole:** `member_administrator`, `member_superuser`

**Parametri:**
- `page` (opcija): Broj stranice
- `limit` (opcija): Broj članova po stranici
- `search` (opcija): Pretraživanje po imenu
- `status` (opcija): Filtriranje po statusu

**Odgovor:**
```json
{
  "members": [
    {
      "member_id": 1,
      "first_name": "Ivo",
      "last_name": "Ivić",
      "email": "ivo@example.com",
      "role": "member",
      "status": "registered"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

#### POST /api/members
Kreira novog člana.

**Dozvole:** `member_administrator`, `member_superuser`

**Zahtjev:**
```json
{
  "first_name": "Novo",
  "last_name": "Ime",
  "email": "novo@example.com",
  "date_of_birth": "1990-01-01",
  "life_status": "employed",
  "gender": "male"
}
```

#### PUT /api/members/:memberId
Ažurira podatke člana.

**Dozvole:** `member_administrator`, `member_superuser`

#### POST /api/members/:memberId/card-number
Dodjeljuje broj kartice članu.

**Dozvole:** `member_administrator`, `member_superuser`

#### POST /api/members/:memberId/regenerate-password
Generira novu lozinku za člana.

**Dozvole:** `member_administrator`, `member_superuser`

### Upravljanje markicama

#### POST /api/members/:memberId/stamp
Dodjeljuje markicu članu.

**Dozvole:** `member_administrator`, `member_superuser`

**Zahtjev:**
```json
{
  "forNextYear": false
}
```

#### GET /api/stamps/inventory
Dohvaća stanje inventara markica.

**Dozvole:** `member_administrator`, `member_superuser`

#### PUT /api/stamps/inventory
Ažurira inventar markica.

**Dozvole:** `member_administrator`, `member_superuser`

### Upravljanje opremom

#### GET /api/members/:memberId/equipment/status
Dohvaća status opreme za člana.

**Dozvole:** `member_administrator`, `member_superuser`

#### POST /api/members/:memberId/equipment/:type/deliver
Označava opremu kao isporučenu.

**Dozvole:** `member_administrator`, `member_superuser`

**Tipovi opreme:** `tshirt`, `shell_jacket`, `hat`

#### GET /api/members/equipment/inventory
Dohvaća inventar opreme.

**Dozvole:** `member_administrator`, `member_superuser`

### Poruke

#### POST /api/messages/member/:memberId
Šalje poruku određenom članu.

**Dozvole:** `member_administrator`, `member_superuser`

#### POST /api/messages/group
Šalje poruku grupi članova.

**Dozvole:** `member_administrator`, `member_superuser`

#### POST /api/messages/all
Šalje poruku svim članovima.

**Dozvole:** `member_administrator`, `member_superuser`

---

## 🔴 Superuser Endpoints

### Upravljanje ulogama

#### PUT /api/members/:memberId/role
Mijenja ulogu člana.

**Dozvole:** `member_superuser`

**Zahtjev:**
```json
{
  "role": "member_administrator"
}
```

### Sistemske operacije

#### POST /api/members/:memberId/stamp/return
Vraća markicu u inventar.

**Dozvole:** `member_superuser`

#### POST /api/members/:memberId/equipment/:type/undeliver
Poništava isporuku opreme.

**Dozvole:** `member_superuser`

#### PUT /api/members/equipment/inventory
Ažurira inventar opreme.

**Dozvole:** `member_superuser`

#### POST /api/stamps/archive-year
Arhivira inventar markica za godinu.

**Dozvole:** `member_superuser`

#### GET /api/audit/logs
Dohvaća audit logove.

**Dozvole:** `member_superuser`

#### GET /api/audit/logs/:memberId
Dohvaća audit logove za određenog člana.

**Dozvole:** `member_superuser`

#### GET /api/settings
Dohvaća sistemske postavke.

**Dozvole:** `member_superuser`

#### PUT /api/settings
Ažurira sistemske postavke.

**Dozvole:** `member_superuser`

#### GET /api/permissions
Dohvaća sve članove s dozvolama.

**Dozvole:** `member_superuser`

#### PUT /api/permissions/:memberId
Ažurira dozvole člana.

**Dozvole:** `member_superuser`

---

## 🏃‍♂️ Activities Endpoints

### Osnovni pristup

#### GET /api/activities
Dohvaća sve aktivnosti.

**Dozvole:** Svi prijavljeni korisnici

#### GET /api/activities/:activityId
Dohvaća određenu aktivnost.

**Dozvole:** Svi prijavljeni korisnici

#### GET /api/activities/member/:memberId
Dohvaća aktivnosti za određenog člana.

**Dozvole:** Svi prijavljeni korisnici

### Kreiranje i upravljanje

#### POST /api/activities
Kreira novu aktivnost.

**Dozvole:** `can_create_activities` (obično administratori)

#### PUT /api/activities/:activityId
Ažurira aktivnost.

**Dozvole:** Organizator aktivnosti ili `member_superuser`

#### PATCH /api/activities/:activityId/cancel
Otkazuje aktivnost.

**Dozvole:** Organizator aktivnosti ili `member_superuser`

#### DELETE /api/activities/:activityId
Briše aktivnost.

**Dozvole:** `member_superuser`

---

## 📧 Messages Endpoints

### Čitanje poruka

#### GET /api/messages/received
Dohvaća primljene poruke.

**Dozvole:** Svi prijavljeni korisnici

#### PUT /api/messages/:messageId/read
Označava poruku kao pročitanu.

**Dozvole:** Vlasnik poruke

### Administratorske funkcije

#### GET /api/messages/admin
Dohvaća sve poruke (admin pogled).

**Dozvole:** `member_administrator`, `member_superuser`

#### PUT /api/messages/:messageId/archive
Arhivira poruku.

**Dozvole:** `member_administrator`, `member_superuser`

#### DELETE /api/messages/:messageId
Briše poruku.

**Dozvole:** `member_superuser`

#### DELETE /api/messages
Briše sve poruke.

**Dozvole:** `member_superuser`

---

## 📊 Statistics Endpoints

#### GET /api/admin/dashboard/stats
Dohvaća statistike za dashboard.

**Dozvole:** `member_administrator`, `member_superuser`

**Parametri:**
- `tenant`: Naziv organizacije (obavezno)

**Odgovor:**
```json
{
  "totalMembers": 150,
  "registeredMembers": 120,
  "activeMembers": 80,
  "pendingRegistrations": 5,
  "recentActivities": 12,
  "systemHealth": "Optimal",
  "lastBackup": "2025-10-25T10:00:00Z"
}
```

---

## 🔧 PIN 2FA Endpoints

#### GET /api/members/:memberId/pin-status
Dohvaća PIN status za člana.

**Dozvole:** Vlasnik računa ili administratori

#### POST /api/members/:memberId/set-pin
Postavlja ili mijenja PIN.

**Dozvole:** Vlasnik računa ili administratori

**Zahtjev:**
```json
{
  "newPin": "123456",
  "currentPin": "654321"
}
```

#### DELETE /api/members/:memberId/remove-pin
Uklanja PIN.

**Dozvole:** Vlasnik računa ili administratori

---

## 🚫 Error Responses

### Standardni error format:
```json
{
  "code": "ERROR_CODE",
  "message": "Opis greške",
  "status": "error"
}
```

### Česti error kodovi:
- `AUTH_INVALID_CREDENTIALS` - Neispravni podaci za prijavu
- `AUTH_INVALID_PIN` - Neispravan PIN
- `AUTH_PIN_LOCKED` - PIN je zaključan
- `MEMBER_NOT_FOUND` - Član nije pronađen
- `INSUFFICIENT_PERMISSIONS` - Nedostatne dozvole
- `VALIDATION_ERROR` - Greška validacije podataka

---

## 📝 Napomene

### Rate Limiting
- Login: 5 pokušaja u 15 minuta
- PIN verifikacija: 3 pokušaja, zatim lockout od 15 minuta
- 2FA setup: 3 pokušaja u 10 minuta

### Paginacija
Standardni parametri za sve liste:
- `page`: Broj stranice (default: 1)
- `limit`: Broj stavki po stranici (default: 20, max: 100)

### Multi-tenant
Svi API pozivi automatski filtriraju podatke po organizaciji na temelju subdomene ili tenant parametra.

---

*Zadnje ažuriranje: 25. listopad 2025.*
