# Superuser Guide - Vodič za superusere

**Uloga:** `member_superuser`  
**Pristup:** Sve funkcionalnosti administratora + dodatne superuser ovlasti

---

## 🎯 Pregled

Kao superuser, imate sve ovlasti administratora plus dodatne funkcionalnosti koje su ograničene samo na superusere:
- Promjena uloga članova
- Brisanje aktivnosti
- Brisanje poruka
- Vraćanje markica u inventar
- Vraćanje opreme u inventar
- Ažuriranje inventara opreme
- Upravljanje dozvolama (permissions)

---

## 🚀 Dashboard

Dashboard superusera prikazuje iste statistike kao i administrator, ali s dodatnim opcijama:

### 🔗 Dodatne opcije u navigaciji
- **Permissions** - Upravljanje dozvolama članova

---

## 👑 Upravljanje ulogama

### Dodjela uloga članovima
**Ruta:** `PUT /api/members/:memberId/role`

1. **Upravljanje članovima** → Odaberite člana
2. **Promijeni ulogu** → Odaberite novu ulogu:
   - `member` → Osnovni član
   - `member_administrator` → Administrator
   - `member_superuser` → Superuser
3. **Potvrdi promjenu** - Član odmah dobiva nove ovlasti

**Napomena:** Samo superuser može mijenjati uloge članova.

---

## 🎯 Upravljanje dozvolama (Permissions)

**Rute:**
- `GET /api/permissions` - Dohvat svih članova s custom dozvolama
- `PUT /api/permissions/:memberId` - Ažuriranje dozvola člana

### Dostupne dozvole
- `can_view_members` - Pregled članova
- `can_edit_members` - Uređivanje članova
- `can_add_members` - Dodavanje članova
- `can_manage_membership` - Upravljanje članstvom
- `can_view_activities` - Pregled aktivnosti
- `can_create_activities` - Kreiranje aktivnosti
- `can_approve_activities` - Odobravanje aktivnosti
- `can_view_financials` - Pregled financija
- `can_manage_financials` - Upravljanje financijama
- `can_send_group_messages` - Slanje grupnih poruka
- `can_view_statistics` - Pregled statistika
- `can_export_data` - Izvoz podataka
- `can_manage_card_numbers` - Upravljanje brojevima iskaznica
- `can_assign_passwords` - Dodjela lozinki

---

## 🎫 Upravljanje markicama (dodatne ovlasti)

### Vraćanje markica u inventar
**Ruta:** `POST /api/members/:memberId/stamp/return`

Vraća markicu članu natrag u inventar.

### Arhiviranje inventara markica
**Ruta:** `POST /api/stamps/archive-year`

Arhivira stanje inventara markica za određenu godinu.

### Reset inventara markica
**Ruta:** `POST /api/stamps/reset-year`

Resetira inventar markica za novu godinu.

---

## 🏃‍♂️ Upravljanje aktivnostima (dodatne ovlasti)

### Brisanje aktivnosti
**Ruta:** `DELETE /api/activities/:activityId`

Samo superuser može trajno obrisati aktivnost.

**Napomena:** Brisanje je trajno i ne može se vratiti.

---

## 💬 Upravljanje porukama (dodatne ovlasti)

### Brisanje pojedinačne poruke
**Ruta:** `DELETE /api/messages/:messageId`

Samo superuser može obrisati pojedinačnu poruku.

### Brisanje svih poruka
**Ruta:** `DELETE /api/messages`

Samo superuser može obrisati sve poruke odjednom.

---

## 🎽 Upravljanje opremom (dodatne ovlasti)

### Vraćanje opreme u inventar
**Ruta:** `POST /api/members/:memberId/equipment/:type/undeliver`

Poništava isporuku opreme i vraća je u inventar.

Tipovi opreme: `tshirt`, `shell_jacket`, `hat`

### Ažuriranje inventara opreme
**Ruta:** `PUT /api/members/equipment/inventory`

Ažurira količine opreme u inventaru (dodavanje novih komada).

---

## ❓ Često postavljana pitanja

### Koja je razlika između superusera i administratora?
Superuser ima sve ovlasti administratora plus:
- Promjena uloga članova
- Brisanje aktivnosti i poruka
- Vraćanje markica i opreme u inventar
- Upravljanje dozvolama

### Mogu li promijeniti ulogu drugom superuseru?
Da, superuser može promijeniti ulogu bilo kojem članu, uključujući druge superusere.

### Što se događa kad obrišem aktivnost?
Aktivnost se trajno briše iz sustava zajedno sa svim povezanim podacima (sudionici, sati, itd.). Brisanje se ne može vratiti.

### Mogu li vratiti obrisane podatke?
Ne, brisanje je trajno. Budite oprezni pri brisanju aktivnosti i poruka.

---

## 🚨 Kritične operacije

### Operacije koje zahtijevaju oprez

#### Brisanje aktivnosti
- Trajno briše aktivnost i sve povezane podatke
- Ne može se vratiti
- Koristi samo kad je apsolutno potrebno

#### Brisanje svih poruka
- Briše sve poruke u sustavu
- Ne može se vratiti
- Koristi s ekstremnim oprezom

#### Promjena uloga
- Odmah mijenja ovlasti člana
- Može utjecati na pristup sustavu
- Provjeri prije promjene

---

## 🆘 Podrška

### Kontakt Organization System Manager-a
Za funkcionalnosti koje zahtijevaju OSM pristup:
- Registracija novih članova
- Dodjela lozinki
- Kreiranje novih System Manager računa

### Tehnička podrška
Za probleme s aplikacijom kontaktirajte tehničku podršku.

---

## 📋 Sažetak superuser ovlasti

### ✅ Što superuser MOŽE (dodatno uz admin ovlasti)
- Mijenjati uloge članova (`PUT /api/members/:memberId/role`)
- Brisati aktivnosti (`DELETE /api/activities/:activityId`)
- Brisati poruke (`DELETE /api/messages/:messageId`, `DELETE /api/messages`)
- Vraćati markice u inventar (`POST /api/members/:memberId/stamp/return`)
- Arhivirati/resetirati inventar markica (`POST /api/stamps/archive-year`, `POST /api/stamps/reset-year`)
- Vraćati opremu u inventar (`POST /api/members/:memberId/equipment/:type/undeliver`)
- Ažurirati inventar opreme (`PUT /api/members/equipment/inventory`)
- Upravljati dozvolama (`GET /api/permissions`, `PUT /api/permissions/:memberId`)

### ❌ Što superuser NE MOŽE
- Kreirati nove organizacije (to radi Global System Manager)
- Pristupiti drugim organizacijama
- Upravljati 2FA postavkama na razini organizacije (to radi OSM)

**Napomena:** Superuser ima sve ovlasti administratora, uključujući registraciju novih članova i dodjelu lozinki. OSM dodjeljuje lozinku samo prvom superuseru, nakon čega superuser preuzima upravljanje članstvom.

---

*Zadnje ažuriranje: 25. listopad 2025.*
