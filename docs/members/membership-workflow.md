# Upravljanje Članarinom - Radni Tijek

**Verzija:** 2025-10-31  
**Status:** ✅ Implementirano i testirano

---

## 📋 Pregled

Ovaj dokument opisuje kompletan radni tijek upravljanja članarinom, karticama i markicama u sustavu. Obuhvaća logiku plaćanja, statuse članova, dodjelu kartica i izdavanje markica.

---

## 🔄 Osnovni Koncept

### Kalendarska godina vs. Članarina

- **Članarina se plaća za KALENDARSKU godinu** (1.1. - 31.12.)
- **Renewal period** - period u kojem se može platiti za sljedeću godinu (obično studeni-prosinac, podešava se u System Settings)
- **Cut-off datum** - datum nakon kojeg počinje grace period (podešava se u System Settings)

---

## 💳 Plaćanje Članarine

### 1. Standardno Plaćanje (Tekuća Godina)

**Scenario:** Član plati članarinu za tekuću godinu (npr. 15.05.2024 za 2024)

**Rezultat:**
- ✅ Status uplate: **"Plaćeno"**
- ✅ Plaćeno za: **2024**
- ✅ Članstvo aktivno: **Do 31.12.2024**

**Uvjeti za potpuno aktivno članstvo:**
1. Plaćena članarina za tekuću godinu
2. Izdana markica (`card_stamp_issued = true`)
3. Aktivan period članstva (`end_date = null`)

---

### 2. Renewal Payment (Plaćanje za Sljedeću Godinu)

**Scenario:** Član plati članarinu za sljedeću godinu PRIJE kraja tekuće godine (npr. 20.11.2023 za 2024)

**Rezultat:**
- ✅ Status uplate: **"Plaćeno"** (odmah pokazuje zeleno!)
- ✅ Plaćeno za: **2024**
- ✅ Članstvo aktivno: **Do 31.12.2023** (još uvijek u tekućoj godini)
- ✅ Od 1.1.2024: Automatski nastavlja s plaćenom godinom 2024

**VAŽNO:**
- Renewal payment se **UVIJEK prihvaća kao validno** plaćanje
- Član može upravljati karticom i markicama čak i ako je platio za sljedeću godinu
- Članstvo ostaje aktivno do kraja tekuće godine

---

### 3. Cut-off Datum i Grace Period

**Cut-off datum** (postavlja se u System Settings, npr. 3. siječanj):

**Primjer:** Cut-off je 3.1.2024

**Što se događa:**

#### PRIJE cut-off-a (do 3.1.2024):
- Član s uplatom za 2023 → Status: **Aktivan** (zeleno)
- Član s uplatom za 2024 → Status: **Aktivan** (zeleno)

#### NAKON cut-off-a (od 4.1.2024):
- Član s uplatom za 2023 → Status: **"Na čekanju"** (žuto) - grace period
- Član s uplatom za 2024 → Status: **Aktivan** (zeleno)

**Grace period traje do auto-terminacije** (scheduled job završava period s `end_date` i `end_reason: 'non_payment'`)

---

## 🎫 Dodjela Brojeva Kartica

### Tko Može Dobiti Karticu?

**PRIJE:** Samo članovi sa `status: 'pending'`  
**SAD:** Članovi sa `status: 'pending'` ILI `status: 'registered'`

**Razlog:** Administrator može zamijeniti izgubljenu/oštećenu karticu postojećem članu.

### Proces Dodjele

1. **Administrator dodjeljuje broj kartice**
2. **Sustav automatski generira lozinku** (prema strategiji u System Settings)
3. **Ažurira se `membership_details.card_number`**
4. **NE postavlja se automatski `registration_completed = true`** (to se postavlja tek nakon što su SVI uvjeti ispunjeni)

---

## ✅ Uvjeti za `registration_completed = true`

**Sve 3 (ili 4) uvjeta moraju biti ispunjena:**

### Za RANDOM_8 strategiju (lozinka ne ovisi o kartici):
1. ✅ Plaćena članarina (`fee_payment_date` postoji)
2. ✅ Izdana markica (`card_stamp_issued = true`)
3. ✅ Aktivan period članstva (`end_date = null`)

### Za ostale strategije (lozinka ovisi o kartici):
1. ✅ Plaćena članarina (`fee_payment_date` postoji)
2. ✅ Dodijeljen broj kartice (`card_number` postoji)
3. ✅ Izdana markica (`card_stamp_issued = true`)
4. ✅ Aktivan period članstva (`end_date = null`)

**VAŽNO:** `registration_completed` se automatski ažurira u funkciji `updateCardDetails()` svaki put kada se mijenja kartica ili markica.

---

## 🏷️ Izdavanje Markica

### Preduvjet

**Član MORA imati dodijeljenu člansku iskaznicu (`card_number`) prije nego što mu se može izdati markica.**

**Razlog:** Markica se fizički lijepi na člansku iskaznicu, pa član mora prvo dobiti karticu.

---

### Pravilo Izdavanja

**Markica se izdaje ZA TEKUĆU KALENDARSKU GODINU.**

**Primjeri:**

#### Scenario 1: Plaćanje u prosincu za sljedeću godinu
- Datum: 20.12.2023
- Plaćeno za: 2024
- **Markica se NE izdaje odmah** (jer je još 2023!)
- **Markica se izdaje 1.1.2024** kada počne nova godina

#### Scenario 2: Plaćanje za tekuću godinu
- Datum: 15.05.2024
- Plaćeno za: 2024
- **Markica se može odmah izdati** (jer je plaćeno za tekuću godinu)

### `next_year_stamp_issued`

**Polje:** `membership_details.next_year_stamp_issued`

**Svrha:** Označava je li markica izdana za SLJEDEĆU godinu (npr. u prosincu za iduću godinu)

---

## 📊 Statusi Članova

### Status Uplate

**Prikazuje se kao badge:**

| Uvjet | Status Badge | Boja |
|-------|-------------|------|
| Plaćeno za tekuću godinu | "Plaćeno" | Zeleno |
| Plaćeno za sljedeću godinu (renewal) | "Plaćeno" | Zeleno |
| Nije plaćeno | "Potrebna uplata" | Crveno |

**Ispod badge-a:** "Plaćeno za: {godina}" (ako postoji uplata)

---

### Status Člana

**Prikazuje se kao badge:**

| Uvjet | Status Badge | Boja |
|-------|-------------|------|
| Svi uvjeti ispunjeni | "Članstvo važeće" | Zeleno |
| Period završen (`end_date` + `end_reason`) | "Članstvo završeno" | Crveno |
| Čeka uplatu/markicu | "Na čekanju" | Žuto |

**VAŽNO:** Ako period ima `end_date` i `end_reason`, status je **UVIJEK CRVENI** bez obzira na mjesec ili godinu!

---

## 🔄 Periodi Članstva

### Aktivni Period

**Definicija:** Period s `end_date = null`

**Značenje:** Član je trenutno aktivan u organizaciji.

### Završeni Period

**Definicija:** Period s `end_date != null` i `end_reason` postavljenim

**Razlozi (`end_reason`):**
- `non_payment` - Neplaćanje članarine
- `withdrawal` - Istupanje
- `expulsion` - Isključenje
- `death` - Smrt

**VAŽNO:** Ako član uplati članarinu NAKON što je period završen, to NE nastavlja stari period - kreira se **NOVI** period!

---

## 🤖 Auto-terminacija Članstava

### Scheduled Job

**Ruta:** `POST /api/members/check-auto-terminations` (ručno pokretanje)

**Automatsko pokretanje:** Svaki dan u ponoć (samo u production mode)

### Logika Auto-terminacije

**Za svaku godinu od najstarijeg člana do trenutne godine:**

1. **Provjeri je li prošao grace period** (cut-off datum)
2. **Pronađi članove gdje:**
   - `fee_payment_year` < godina ILI `fee_payment_year` = null
   - `status` != 'inactive'
   - `role` != 'member_superuser'
3. **Ažuriraj:**
   - `member.status` → 'inactive'
   - `membership_period.end_date` → 31.12. prethodne godine
   - `membership_period.end_reason` → 'non_payment'

**Primjer:**
- Danas: 4.1.2024
- Cut-off: 3.1.2024
- Član platio za: 2023
- **Rezultat:** Period završava 31.12.2023, razlog: non_payment

---

## 🎯 Najbolje Prakse

### Za Administratore

1. **Plaćanja u prosincu:**
   - Pitajte člana plaća li za trenutnu ili sljedeću godinu
   - Koristite checkbox "Ovo je renewal plaćanje" ako plaća za iduću godinu

2. **Dodjela kartica:**
   - Kartice se mogu dodijeliti i pending i registered članovima
   - Pas se automatski generira

3. **Izdavanje markica:**
   - Član MORA imati dodijeljenu člansku iskaznicu prije izdavanja markice
   - Markice se izdaju SAMO za tekuću kalendarsku godinu
   - Za renewal plaćanja, pričekajte novu godinu prije izdavanja markice

4. **Provjera statusa:**
   - Zeleno (Status uplate) + Zeleno (Status člana) = Sve u redu
   - Crveno (Status člana) = Period završen, potreban novi period

### Za Superusere

1. **Cut-off datum:**
   - Postavite realan cut-off datum u System Settings
   - Preporučeno: 1-7 dana nakon Nove godine

2. **Auto-terminacija:**
   - Provjerite redovito izvršavanje scheduled job-a
   - U development mode koristite ručno pokretanje

3. **Testiranje:**
   - Koristite "Provjeri istekla članstva" button za testiranje
   - Provjerite različite scenarije s mock datumima

---

## 🔧 Tehničke Reference

### Backend Funkcije

**`calculateMembershipStatus()`** - `backend/src/utils/membershipStatusCalculator.ts`
- Kalkulira je li članstvo važeće
- Provjerava uplatu, markicu i aktivan period
- Vraća status i razlog

**`updateCardDetails()`** - `backend/src/services/membership.service.ts`
- Ažurira karticu i markicu
- Automatski postavlja `registration_completed` prema uvjetima
- Automatski postavlja `status` ('registered' ili 'pending')

**`processFeePayment()`** - `backend/src/services/membership.service.ts`
- Procesira uplatu članarine
- Određuje godinu plaćanja (renewal logic)
- Kreira ili nastavlja period članstva

**`checkAutoTerminations()`** - `backend/src/services/membership.service.ts`
- Provjerava i završava istekla članstva
- Pokreće se automatski svaki dan u ponoć

### Frontend Helper Funkcije

**`hasPaidMembershipFee()`** - `frontend/shared/types/memberStatus.types.ts`
- Provjera je li član platio za tekuću ili sljedeću godinu
- Prihvaća renewal payment

**`determineFeeStatus()`** - `frontend/shared/types/memberStatus.types.ts`
- Određuje status plaćanja ('current' ili 'payment required')

---

## 📅 Changelog

### 2025-10-31
- ✅ Implementirana renewal payment logika
- ✅ Uklonjena blokada dodjele kartica za registered članove
- ✅ Dodana provjera svih 3 uvjeta za `registration_completed`
- ✅ Popravljen prikaz statusa člana (crveno ako ima `end_date`)
- ✅ Uklonjeno "Grace period active" iz translation poruka
- ✅ Dodana provjera da član mora imati dodijeljenu člansku iskaznicu prije izdavanja markice
- ✅ Dokumentiran kompletan workflow

---

## ❓ FAQ

### Može li član platiti za više godina unaprijed?

Ne. Sustav podržava plaćanje samo za tekuću ili sljedeću godinu.

### Što ako član plati u prosincu, može li dobiti markicu odmah?

Ne, markica se izdaje tek kada počne godina za koju je plaćeno.

### Može li član dobiti markicu bez dodijeljene članske iskaznice?

Ne. Član MORA imati dodijeljenu člansku iskaznicu (`card_number`) prije nego što mu se može izdati markica. Razlog je što se markica fizički lijepi na člansku iskaznicu.

### Može li se period ručno završiti prije kraja godine?

Da, administrator može postaviti `end_date` i `end_reason` ručno.

### Što se događa s satima aktivnosti kada period završi?

Sati aktivnosti ostaju zabilježeni (`total_hours` i `activity_hours`), ali se ne resetiraju. To je podatak za statistiku.

### Kako testirati renewal payment u development modu?

1. Postavi mock datum u studeni/prosinac (npr. 20.11.2023)
2. Upiši uplatu za sljedeću godinu (2024)
3. Provjeri prikazuju li se indikatori zeleno
4. Promijeni mock datum na 1.1.2024
5. Provjeri nastavlja li članstvo

---

## ⏱️ Računanje Sati Aktivnosti

### Dva Tipa Sati

**`total_hours`** - Ukupni sati kroz cijelu povijest članstva
- Zbroj svih sati iz svih aktivnosti ikada
- Koristi se za statistiku i povijesne podatke
- **NE koristi se** za određivanje aktivnog/pasivnog statusa

**`activity_hours`** - Sati za tekuću i prošlu godinu
- Zbroj sati iz aktivnosti za **tekuću + prošlu kalendarsku godinu**
- **Koristi se** za određivanje aktivnog/pasivnog statusa
- **Prikazuje se** u MemberTable i MemberList

### Primjer Računanja (2024. godina)

**Član ima aktivnosti:**
- 2022: 100 sati
- 2023: 150 sati
- 2024: 200 sati

**Rezultat:**
- `total_hours` = 450 sati (100 + 150 + 200)
- `activity_hours` = 350 sati (150 + 200) - samo 2023 i 2024

### Prag za Aktivnost

**System Setting:** `activityHoursThreshold` (default: 20 sati)

**Logika:**
- `activity_hours >= 20` → **Aktivan član** (zeleno)
- `activity_hours < 20` → **Pasivan član** (žuto)

**VAŽNO:** Prag se odnosi samo na `activity_hours`, ne na `total_hours`!

---

## 🔗 Relacija Članovi ↔ Aktivnosti

### Baza Podataka

**Tablica:** `activity_participants`

**Struktura:**
```sql
activity_participants (
  participation_id INT PRIMARY KEY,
  activity_id INT FOREIGN KEY → activities,
  member_id INT FOREIGN KEY → members,
  hours_worked INT, -- Sati u minutama
  created_at TIMESTAMP
)
```

### Kako se Računaju Sati

**Backend Query:**
```sql
SELECT 
  m.member_id,
  SUM(ap.hours_worked) as total_hours,
  SUM(CASE 
    WHEN YEAR(a.start_date) IN (YEAR(CURDATE()), YEAR(CURDATE())-1)
    THEN ap.hours_worked 
    ELSE 0 
  END) as activity_hours
FROM members m
LEFT JOIN activity_participants ap ON m.member_id = ap.member_id
LEFT JOIN activities a ON ap.activity_id = a.activity_id
GROUP BY m.member_id
```

**Funkcija:** `getMembersWithStats()` - `backend/src/repositories/member.repository.ts`

### Dodavanje Sati Članu

**Način 1: Kroz Aktivnost**
1. Kreiraj aktivnost (`POST /api/activities`)
2. Dodaj članove kao sudionike s brojem sati
3. Sati se automatski zbrajaju u `total_hours` i `activity_hours`

**Način 2: Ručno (Admin)**
1. Idi na profil člana
2. Klikni "Uredi sate"
3. Unesi broj sati i razlog
4. Sati se dodaju kroz "phantom" aktivnost

### Ažuriranje Sati

**Automatski:**
- Svaki put kada se kreira/ažurira/briše aktivnost
- Svaki put kada se dodaje/uklanja sudionik
- Backend automatski preračunava `total_hours` i `activity_hours`

**Ručno:**
- Admin može ručno dodati/oduzeti sate
- Koristi se za korekcije ili posebne slučajeve

---

## 🎯 Filteri u MemberList

### Filter "Na čekanju"

**Logika:**
- Status: `pending`

**Svrha:** Prikazuje članove koji još nisu u potpunosti registrirani (npr. nedostaje uvjet plaćanja/markice/perioda).

### Filter "Bivši članovi"

**Logika:**
- Status: `inactive`

**Svrha:** Prikazuje članove s dovršenim periodom članstva (npr. neplaćanje, istupanje i sl.).

### Filter "Aktivni" / "Pasivni"

**Logika:**
- **Aktivni:** `activity_hours >= activityHoursThreshold` (default 20)
- **Pasivni:** `activity_hours < activityHoursThreshold`

**VAŽNO:** 
- Koristi se `activity_hours` (tekuća + prošla godina), ne `total_hours`
- Bivši članovi (`end_date !== null`) se ne prikazuju u ovim filterima

### Filter "Redovni članovi"

**Logika:**
- Status: `registered`
- Tip članstva: `regular`
- Životni status: `employed/unemployed`, `child/pupil/student`, ili `pensioner`

**Svrha:** Prikazuje članove s obojenim retcima (prema životnom statusu)

---

## 🧪 Testiranje s Mock Datumom

### Postavljanje Mock Datuma

**Frontend:**
```typescript
// System Settings → Time Traveler
setMockDate(new Date('2023-06-15'));
```

**Backend:**
```typescript
// API endpoint: POST /api/system/mock-date
{ "mockDate": "2023-06-15T00:00:00.000Z" }
```

### Što Mock Datum Utječe

**✅ Utječe:**
- Provjera plaćanja članarine (`getYearForPaymentCheck()`)
- Filteri "Plaćeno" / "Nije plaćeno"
- Računanje `activity_hours` (tekuća + prošla godina)
- Grace period provjere
- Auto-terminacija članstava

**❌ NE utječe:**
- `total_hours` (uvijek zbroj svih sati)
- Stvarni datumi u bazi podataka
- Stvarno vrijeme izvršavanja scheduled job-ova

### Testiranje Scenarija

**Scenario 1: Plaćanje za 2023**
```
1. Postavi mock datum: 15.06.2023
2. Dodaj uplatu za 2023
3. Filter "Plaćeno" → trebaju se prikazati članovi s fee_payment_year: 2023
4. Filter "Nije plaćeno" → ne bi trebao biti nitko
```

**Scenario 2: Prijelaz godine**
```
1. Postavi mock datum: 31.12.2023
2. Provjeri status članova s uplatom za 2023 → zeleno
3. Postavi mock datum: 01.01.2024
4. Provjeri status članova s uplatom za 2023 → žuto (grace period)
5. Postavi mock datum: 04.01.2024 (nakon cut-off-a)
6. Provjeri status članova s uplatom za 2023 → crveno (isteklo)
```

**Scenario 3: Računanje Sati**
```
1. Postavi mock datum: 15.06.2024
2. Član ima aktivnosti: 2022 (100h), 2023 (150h), 2024 (200h)
3. activity_hours = 350 (2023 + 2024)
4. Postavi mock datum: 15.06.2025
5. activity_hours = 200 (samo 2024, jer je sad 2025)
```

---

## 📊 Prikaz Sati u UI

### MemberTable

**Kolona "SATI":**
- Prikazuje: `activity_hours` (tekuća + prošla godina)
- Format: "XXh XXm" (npr. "23h 28m")
- Sortiranje: Po `activity_hours`

**Boja retka:**
- Zeleno: `activity_hours >= 20` (aktivan)
- Žuto: `activity_hours < 20` (pasivan)
- Crveno: Period završen (`end_date !== null`)

### MemberProfile

**Sekcija "Statistika":**
- **Ukupni sati:** `total_hours` (svi sati kroz povijest)
- **Sati (tekuća + prošla godina):** `activity_hours`
- **Status aktivnosti:** Aktivan/Pasivan (prema `activity_hours`)

### ActivityList

**Prikaz sudionika:**
- Ime člana
- Broj sati za tu aktivnost
- Ukupni sati člana (tooltip)

---

## 🔧 Backend Funkcije za Sate

### `getMembersWithStats()`
**Lokacija:** `backend/src/repositories/member.repository.ts`

**Što radi:**
- Dohvaća sve članove s izračunatim satima
- Računa `total_hours` i `activity_hours`
- Koristi SQL agregaciju za performanse

### `calculateMemberHours()`
**Lokacija:** `backend/src/services/member.service.ts`

**Što radi:**
- Računa sate za pojedinačnog člana
- Koristi se za ažuriranje nakon promjene aktivnosti

### `updateActivityHours()`
**Lokacija:** `backend/src/services/activities.service.ts`

**Što radi:**
- Ažurira sate svih sudionika aktivnosti
- Poziva se nakon kreiranja/ažuriranja/brisanja aktivnosti

---

## 📝 Najbolje Prakse za Sate

### Za Administratore

1. **Dodavanje sati:**
   - Uvijek kroz aktivnost (ne ručno) osim za korekcije
   - Provjerite točnost broja sati prije spremanja

2. **Provjera aktivnosti:**
   - Redovito provjeravajte `activity_hours` članova
   - Pasivni članovi (< 20h) trebaju biti motivirani za više aktivnosti

3. **Korekcije:**
   - Koristite "Uredi sate" samo za greške ili posebne slučajeve
   - Dodajte razlog korekcije

### Za Superusere

1. **Prag aktivnosti:**
   - Postavite realan `activityHoursThreshold` u System Settings
   - Preporučeno: 20 sati godišnje

2. **Izvještaji:**
   - Koristite `total_hours` za povijesne izvještaje
   - Koristite `activity_hours` za trenutnu aktivnost

3. **Testiranje:**
   - Testirajte računanje sati s mock datumom
   - Provjerite prijelaz godine (31.12 → 1.1)

---

**Kraj dokumenta**
