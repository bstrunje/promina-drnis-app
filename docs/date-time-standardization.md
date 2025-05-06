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

## Testiranje vremenskih funkcionalnosti

Aplikacija sadrži mehanizam za simulaciju datuma za potrebe testiranja vremenski-osjetljivih funkcionalnosti. Ovi alati su dostupni samo u razvojnom okruženju.

Za više informacija o testiranju s vremenskim podacima, pogledajte [dokumentaciju o testiranju](./testing.md).
