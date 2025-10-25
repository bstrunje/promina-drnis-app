# Superuser Quick Manual

**Uloga:** `member_superuser`  
**Pristup:** Sve što administrator + dodatne ovlasti

---

## 🎯 Što možeš raditi (dodatno uz admin ovlasti)

Kao superuser, imaš **sve ovlasti administratora** PLUS:

1. ✅ **Registracija novih članova** i dodjela lozinki
2. ✅ **Promjena uloga** članova
3. ✅ **Brisanje aktivnosti**
4. ✅ **Brisanje poruka**
5. ✅ **Vraćanje markica** u inventar
6. ✅ **Vraćanje opreme** u inventar
7. ✅ **Upravljanje dozvolama** članova
8. ✅ **Arhiviranje/reset** inventara markica

---

## 📋 Najvažniji zadaci

### 1️⃣ Promjena uloge članu

**Samo ti možeš mijenjati uloge!**

1. Idi na **Upravljanje članovima**
2. Odaberi člana
3. Klikni **Promijeni ulogu**
4. Odaberi novu ulogu:
   - `member` - Osnovni član
   - `member_administrator` - Administrator
   - `member_superuser` - Superuser
5. Potvrdi promjenu

**Ruta:** `PUT /api/members/:memberId/role`

**Napomena:** Možeš promijeniti ulogu bilo kojem članu, uključujući druge superusere.

---

### 2️⃣ Upravljanje dozvolama

**Fine-tuning ovlasti za administratore.**

1. Idi na **Permissions** tab
2. Vidiš članove s custom dozvolama
3. Odaberi člana
4. Uključi/isključi specifične dozvole:
   - `can_view_members` - Pregled članova
   - `can_edit_members` - Uređivanje članova
   - `can_add_members` - Dodavanje članova
   - `can_create_activities` - Kreiranje aktivnosti
   - `can_send_group_messages` - Slanje grupnih poruka
   - `can_manage_card_numbers` - Upravljanje brojevima iskaznica
   - i druge...
5. Spremi promjene

**Rute:**
- `GET /api/permissions` - Dohvat članova s dozvolama
- `PUT /api/permissions/:memberId` - Ažuriranje dozvola

---

### 3️⃣ Brisanje aktivnosti

**Samo ti možeš trajno obrisati aktivnost!**

1. Idi na **Aktivnosti**
2. Odaberi aktivnost
3. Klikni **Obriši**
4. Potvrdi brisanje

**Ruta:** `DELETE /api/activities/:activityId`

⚠️ **Oprez:** Brisanje je trajno i ne može se vratiti! Briše se aktivnost i svi povezani podaci (sudionici, sati, itd.).

---

### 4️⃣ Brisanje poruka

**Samo ti možeš brisati poruke!**

#### Brisanje pojedinačne poruke
1. Idi na **Poruke**
2. Odaberi poruku
3. Klikni **Obriši**
4. Potvrdi

**Ruta:** `DELETE /api/messages/:messageId`

#### Brisanje svih poruka
⚠️ **EKSTREMNI OPREZ!**

**Ruta:** `DELETE /api/messages`

Briše **SVE** poruke u sustavu. Ne može se vratiti!

---

### 5️⃣ Vraćanje markica u inventar

**Ako član vrati markicu, možeš je vratiti u inventar.**

1. Idi na **Upravljanje članovima**
2. Odaberi člana
3. Idi na **Markice**
4. Klikni **Vrati u inventar**

**Ruta:** `POST /api/members/:memberId/stamp/return`

---

### 6️⃣ Arhiviranje inventara markica

**Na kraju godine, arhiviraj stanje inventara.**

1. Idi na **Markice** → **Inventar**
2. Klikni **Arhiviraj godinu**
3. Odaberi godinu
4. Potvrdi

**Ruta:** `POST /api/stamps/archive-year`

---

### 7️⃣ Reset inventara markica

**Za novu godinu, resetiraj inventar.**

1. Idi na **Markice** → **Inventar**
2. Klikni **Reset za novu godinu**
3. Odaberi godinu
4. Potvrdi

**Ruta:** `POST /api/stamps/reset-year`

---

### 8️⃣ Vraćanje opreme u inventar

**Ako član vrati opremu, možeš je vratiti u inventar.**

1. Idi na **Upravljanje članovima**
2. Odaberi člana
3. Idi na **Oprema**
4. Odaberi tip opreme (majica, jakna, kapa)
5. Klikni **Vrati u inventar**

**Ruta:** `POST /api/members/:memberId/equipment/:type/undeliver`

**Tipovi opreme:** `tshirt`, `shell_jacket`, `hat`

---

### 9️⃣ Ažuriranje inventara opreme

**Dodaj nove komade opreme u inventar.**

1. Idi na **Oprema** → **Inventar**
2. Odaberi tip opreme
3. Unesi količine po veličinama
4. Klikni **Ažuriraj inventar**

**Ruta:** `PUT /api/members/equipment/inventory`

---

## 🔐 Što administrator NE MOŽE, a ti MOŽEŠ

| Funkcionalnost | Administrator | Superuser |
|----------------|---------------|-----------|
| Promjena uloga | ❌ Ne | ✅ Da |
| Brisanje aktivnosti | ❌ Ne | ✅ Da |
| Brisanje poruka | ❌ Ne | ✅ Da |
| Vraćanje markica | ❌ Ne | ✅ Da |
| Vraćanje opreme | ❌ Ne | ✅ Da |
| Upravljanje dozvolama | ❌ Ne | ✅ Da |
| Arhiviranje inventara | ❌ Ne | ✅ Da |

---

## ❌ Što NE možeš raditi

- ❌ Mijenjati sistemske postavke organizacije (to radi OSM)
- ❌ Pristupiti drugim organizacijama
- ❌ Pristupiti audit logovima (to radi OSM)

**Napomena:** OSM dodjeljuje lozinku samo prvom superuseru pri inicijalizaciji organizacije. Nakon toga, superuser preuzima upravljanje članstvom i može registrirati nove članove i dodijeliti im lozinke.

---

## ⚠️ Kritične operacije - OPREZ!

### Brisanje aktivnosti
- ✋ Trajno briše aktivnost i sve povezane podatke
- ✋ Ne može se vratiti
- ✋ Koristi samo kad je apsolutno potrebno

### Brisanje svih poruka
- ✋ Briše **SVE** poruke u sustavu
- ✋ Ne može se vratiti
- ✋ Koristi s ekstremnim oprezom

### Promjena uloga
- ✋ Odmah mijenja ovlasti člana
- ✋ Može utjecati na pristup sustavu
- ✋ Provjeri prije promjene

---

## 🆘 Pomoć

**Trebaš promijeniti sistemske postavke?**  
Kontaktiraj Organization System Manager (2FA, card number length, membership renewal, itd.).

**Trebaš pristupiti audit logovima?**  
Kontaktiraj Organization System Manager.

**Tehnički problemi?**  
Kontaktiraj tehničku podršku.

---

## 📋 Brzi pregled API ruta

### Upravljanje ulogama i dozvolama
- `PUT /api/members/:memberId/role` - Promjena uloge
- `GET /api/permissions` - Dohvat članova s dozvolama
- `PUT /api/permissions/:memberId` - Ažuriranje dozvola

### Brisanje
- `DELETE /api/activities/:activityId` - Brisanje aktivnosti
- `DELETE /api/messages/:messageId` - Brisanje poruke
- `DELETE /api/messages` - Brisanje svih poruka

### Markice
- `POST /api/members/:memberId/stamp/return` - Vraćanje markice
- `POST /api/stamps/archive-year` - Arhiviranje inventara
- `POST /api/stamps/reset-year` - Reset inventara

### Oprema
- `POST /api/members/:memberId/equipment/:type/undeliver` - Vraćanje opreme
- `PUT /api/members/equipment/inventory` - Ažuriranje inventara

---

*Verzija: 2025-10-25*
