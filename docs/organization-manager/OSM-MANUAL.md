# OSM Quick Manual

**Uloga:** Organization System Manager  
**Pristup:** Upravljanje jednom organizacijom

---

## 🚀 Brzi start

### Prva prijava
1. Prijavi se s kredencijalima koje ti je dao GSM
2. **Moraš promijeniti lozinku** pri prvoj prijavi
3. Preporučujemo postavljanje PIN 2FA za sigurnost

---

## 📋 Osnovni zadaci

### 1️⃣ Registracija novih članova

**Kada član popuni registracijski obrazac, pojavljuje se u "Pending Members".**

1. Idi na **Register Members** tab
2. Vidiš listu članova koji čekaju aktivaciju
3. **PRVI ČLAN = SUPERUSER:**
   - Prvog registriranog člana **moraš kreirati kao superusera**
   - Odaberi ulogu: `member_superuser`
   - Lozinka se generira prema strategiji:
     - **Strategija 1:** `ImePrezime+CardSeparator+BrojKartice`
     - Primjer: `IvoIvic-00000` (broj kartice 00000 dok superuser ne unese pravi)
     - **Strategija 2:** Random generirana lozinka
     - **Strategija 3:** `EmailPrefix+Last4DigitsOfCardNumber`
     - Primjer: `ivo.ivic0000` (iz email-a ivo.ivic@example.com + zadnje 4 znamenke kartice)
   - Superuser će kasnije sam sebi dodijeliti pravi broj kartice
4. **OSTALI ČLANOVI:**
   - Klikni **Assign Password**
   - Sustav generira lozinku prema strategiji
   - Opcionalno dodijeli broj iskaznice
   - Odaberi ulogu (member ili member_administrator)
5. Član sada može pristupiti sustavu

**API:** `POST /api/system-manager/assign-password`

---

### 2️⃣ Pregled svih članova

1. Idi na **Members** tab
2. Vidiš sve članove organizacije
3. Možeš filtrirati po statusu i ulozi
4. Možeš pretraživati po imenu

**API:** `GET /api/system-manager/members`

---

### 3️⃣ Sistemske postavke organizacije

**Ruta:** Settings tab

#### Card Numbers (Brojevi iskaznica)
- Postavi duljinu broja iskaznice (4-8 znamenki)

#### Membership Renewal (Obnova članstva)
- Postavi datume obnove članstva
- Postavi datume isteka članstva

#### Password Generation (Generiranje lozinki)
- Odaberi strategiju generiranja lozinki za nove članove

#### Time Zone
- Postavi vremensku zonu organizacije

**API:** `PUT /api/system-manager/settings`

---

### 4️⃣ 2FA postavke

**Omogući/onemogući 2FA za organizaciju.**

1. Idi na **Settings** → **2FA Configuration**
2. Uključi **PIN 2FA** za članove
3. Postavi **Trusted Devices** (koliko dugo uređaj ostaje pouzdan)
4. Odaberi koje uloge i dozvole zahtijevaju 2FA

**API:** `PUT /api/system-manager/settings`

---

### 5️⃣ Upravljanje praznicima

**Dodaj praznike koji utječu na duty calendar.**

1. Idi na **Holidays** tab
2. Klikni **Add Holiday**
3. Unesi naziv i datum
4. Spremi

**Brzi način:** Klikni **Seed Default Holidays** za hrvatske državne praznike.

**API:**
- `POST /api/system-manager/holidays` - Dodaj praznik
- `POST /api/system-manager/holidays/seed` - Dodaj default praznike
- `DELETE /api/system-manager/holidays/year/:year` - Obriši sve za godinu

---

### 6️⃣ Duty Calendar postavke

**Konfiguriraj kako funkcionira duty calendar.**

1. Idi na **Duty Settings**
2. Postavi:
   - **Duty Calendar Enabled** - Uključi/isključi duty calendar
   - **Max Participants** - Maksimalan broj sudionika po dužnosti
   - **Auto Create Enabled** - Automatsko kreiranje dužnosti

**API:** `PUT /api/system-manager/duty-settings`

---

### 7️⃣ Audit Logs

**Pregled svih aktivnosti u organizaciji.**

1. Idi na **Audit Logs** tab
2. Vidiš sve akcije članova i system managera
3. Možeš filtrirati po datumu i tipu akcije

**API:** `GET /api/system-manager/audit-logs`

---

### 8️⃣ Brisanje člana

**Oprez: Trajno briše člana!**

1. Idi na **Members** tab
2. Odaberi člana
3. Klikni **Delete**
4. Potvrdi brisanje

**API:** `DELETE /api/system-manager/members/:memberId`

---

## ❌ Što NE možeš raditi

- ❌ Kreirati nove organizacije (to radi GSM)
- ❌ Pristupiti drugim organizacijama
- ❌ Mijenjati globalne postavke platforme
- ❌ Kreirati druge OSM račune
- ❌ Mijenjati uloge postojećih članova (to radi superuser)
- ❌ Upravljati custom dozvolama članova (to radi superuser)

---

## 🆘 Pomoć

**Zaboravio si lozinku?**  
Kontaktiraj Global System Manager da ti resetira lozinku.

**Trebaju ti dodatne organizacije?**  
Kontaktiraj Global System Manager.

**Tehnički problemi?**  
Kontaktiraj tehničku podršku.

---

*Verzija: 2025-10-25*
