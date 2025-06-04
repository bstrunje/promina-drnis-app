# Standardizacija korištenja datuma i vremena

## Pregled

Ovaj dokument opisuje standardni način korištenja datuma i vremena u Promina-Drnis aplikaciji kako bi se osigurala konzistentnost prikaza i upravljanja vremenskim podacima kroz cijeli sustav.

## Centralizirani pristup: dateUtils.ts

Aplikacija koristi centralizirani pristup za rad s datumima i vremenima kroz datoteku `frontend/src/utils/dateUtils.ts`. Ovaj modul pruža sve potrebne funkcije za formatiranje, parsiranje i manipulaciju datumima.

### Ključne funkcije

| Funkcija | Opis | Primjer |
|----------|------|---------|
| `formatDate(date, pattern)` | Formatira datum za prikaz | `formatDate(isoDate, 'dd.MM.yyyy HH:mm')` |
| `parseDate(dateString)` | Parsira string datuma | `parseDate('01.01.2023')` |
| `getCurrentDate()` | Vraća trenutni datum | `getCurrentDate()` |
| `formatInputDate(date)` | Formatira za input polja | `formatInputDate(date)` |
| `cleanISODateString(isoString)` | Čisti ISO string od dodatnih navodnika | `cleanISODateString(dateFromBackend)` |
| `setCurrentTimeZone(timeZone)` | Postavlja vremensku zonu | `setCurrentTimeZone('Europe/Zagreb')` |
| `getCurrentTimeZone()` | Dohvaća trenutnu v. zonu | `getCurrentTimeZone()` |

## Vremenske zone

Aplikacija koristi globalni pristup za upravljanje vremenskim zonama kroz `TimeZoneContext` i `dateUtils`. Vremenska zona postavlja se na razini aplikacije i automatski se primjenjuje u svim funkcijama za rad s datumima.

### Način implementacije

1. **TimeZoneContext** (`frontend/src/context/TimeZoneContext.tsx`) pruža globalni kontekst za upravljanje vremenskom zonom
2. **dateUtils** (`frontend/src/utils/dateUtils.ts`) koristi postavljenu vremensku zonu za formatiranje datuma
3. Vremenska zona postavlja se kroz administratorske postavke sustava

## Najbolje prakse

### Pravilno korištenje

```typescript
// Importiraj funkcije iz dateUtils
import { formatDate, getCurrentDate } from "../../utils/dateUtils";

// Formatiranje za prikaz
{formatDate(user.created_at, 'dd.MM.yyyy HH:mm')}

// Dohvat trenutnog datuma
const today = getCurrentDate();
```

### Neispravno korištenje (izbjegavati)

```typescript
// Ne koristi direktne metode za formatiranje
{new Date(user.created_at).toLocaleString('hr-HR')}

// Ne koristi direktnu instancu datuma bez vremenske zone
{new Date().toISOString()}
```

## Česti problemi i njihova rješenja

### Problem dvostruke primjene vremenske zone

**Problem:**
```tsx
formatDate(new Date(date).toLocaleString('hr-HR'), 'dd.MM.yyyy')
```

**Rješenje:**
```tsx
formatDate(date, 'dd.MM.yyyy')
```

### Nekonzistentni prikaz vremena

**Problem:**
Korištenje različitih metoda formatiranja u različitim dijelovima aplikacije.

**Rješenje:**
Standardizirati korištenje `formatDate` funkcije kroz cijelu aplikaciju.

### Problem s ISO formatom datuma s dodatnim navodnicima

**Problem:**
Backend ponekad vraća datume u nestandardnom ISO formatu s dodatnim navodnicima oko 'T' i 'Z' znakova, npr:

```
"2025-04-01'T'02:00:00.000'Z'"
```

umjesto standardnog ISO formata:

```
"2025-04-01T02:00:00.000Z"
```

Ovo uzrokuje probleme pri parsiranju datuma u frontendu jer funkcije poput `parseISO` iz date-fns biblioteke očekuju standardni ISO format.

**Rješenje:**
Za rješavanje ovog problema implementirana je funkcija `cleanISODateString` u `frontend/src/utils/dateUtils.ts` koja čisti ISO string od dodatnih navodnika prije formatiranja.

```typescript
// Umjesto direktnog formatiranja
formatDate(member.membership_details.fee_payment_date, 'dd.MM.yyyy.')

// Koristiti cleanISODateString prije formatiranja
formatDate(cleanISODateString(member.membership_details.fee_payment_date), 'dd.MM.yyyy.')
```

**Gdje koristiti:**
Funkciju `cleanISODateString` treba koristiti za sve datume koji dolaze s backenda, posebno za datume koji se formatiraju u `member.controller.ts` s formatom koji uključuje navodnike oko 'T' i 'Z' znakova. Ovo uključuje:

- Datume vezane uz članarine (fee_payment_date)
- Datume članskih razdoblja (start_date, end_date)
- Datume aktivnosti i poruka (created_at, timestamp)
- Datume statusa sustava i audit logova

## Testiranje vremenskih funkcionalnosti

Aplikacija sadrži mehanizam za simulaciju datuma za potrebe testiranja vremenski-osjetljivih funkcionalnosti. Ovi alati su dostupni samo u razvojnom okruženju.

Za više informacija o testiranju s vremenskim podacima, pogledajte [dokumentaciju o testiranju](./testing.md).
