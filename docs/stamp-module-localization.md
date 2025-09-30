# Stamp Module - Lokalizacija

## Datum: 30. rujan 2025.

Dokumentacija lokalizacije modula za upravljanje markicama (stamps) u backend dijelu aplikacije.

---

## 1. Pregled

Modul za upravljanje markicama (`stamp`) je potpuno lokaliziran kako bi podržavao više jezika (hrvatski i engleski). Lokalizacija pokriva sve poruke greški, uspješnih operacija i upozorenja.

---

## 2. Struktura lokalizacijskih datoteka

### 2.1. Lokacije datoteka

**Hrvatski jezik:**
```
backend/src/locales/hr/stamp.json
```

**Engleski jezik:**
```
backend/src/locales/en/stamp.json
```

### 2.2. Struktura JSON datoteke

```json
{
  "errors": {
    "FETCH_INVENTORY": "Poruka greške",
    "INVALID_YEAR": "Poruka greške",
    // ... ostale greške
  },
  "success": {
    "INVENTORY_UPDATED": "Poruka uspjeha",
    "INVENTORY_ARCHIVED": "Poruka uspjeha",
    // ... ostale uspješne operacije
  },
  "warnings": {
    "RESET_DEPRECATED": "Upozorenje"
  },
  "stampTypes": {
    "employed": "zaposleni/nezaposleni",
    "student": "dijete/učenik/student",
    "pensioner": "umirovljenik"
  }
}
```

---

## 3. Popis lokaliziranih poruka

### 3.1. Error kodovi

| Kod | Hrvatski | Engleski |
|-----|----------|----------|
| `FETCH_INVENTORY` | Greška prilikom dohvaćanja inventara markica | Error fetching stamp inventory |
| `FETCH_INVENTORY_YEAR` | Greška prilikom dohvaćanja inventara markica za godinu {{year}} | Error fetching stamp inventory for year {{year}} |
| `INVALID_YEAR` | Neispravna godina | Invalid year parameter |
| `YEAR_REQUIRED` | Godina je obavezna | Valid year parameter is required |
| `NEGATIVE_COUNT` | Početni broj ne može biti negativan | Initial count cannot be negative |
| `COUNT_BELOW_ISSUED` | Novi broj ne može biti manji od već izdanih markica | New count cannot be less than already issued stamps |
| `UPDATE_INVENTORY` | Greška prilikom ažuriranja inventara markica | Error updating stamp inventory |
| `ALL_VALUES_NUMBERS` | Sve vrijednosti inventara moraju biti brojevi | All inventory values must be numbers |
| `VALUES_NEGATIVE` | Vrijednosti inventara ne mogu biti negativne | Inventory values cannot be negative |
| `STAMP_TYPE_REQUIRED` | Tip markice je obavezan | Stamp type is required |
| `NO_INVENTORY` | Nema inventara za {{type}} markice za godinu {{year}} | No inventory found for {{type}} stamps for year {{year}} |
| `NO_STAMPS_AVAILABLE` | Nema dostupnih {{type}} markica u inventaru za godinu {{year}} | No {{type}} stamps available in inventory for year {{year}} |
| `ISSUE_STAMP` | Greška prilikom izdavanja markice | Error issuing stamp |
| `RETURN_STAMP` | Greška prilikom vraćanja markice | Error returning stamp |
| `MEMBER_NOT_FOUND` | Član nije pronađen | Member not found |
| `ISSUE_STAMP_TO_MEMBER` | Greška prilikom izdavanja markice članu | Error issuing stamp to member |
| `FETCH_HISTORY` | Greška prilikom dohvaćanja povijesti markica | Error fetching stamp history |
| `FETCH_HISTORY_YEAR` | Greška prilikom dohvaćanja povijesti markica za godinu {{year}} | Error fetching stamp history for year {{year}} |
| `ALREADY_ARCHIVED` | Inventar markica za godinu {{year}} je već arhiviran | Stamp inventory for year {{year}} has already been archived |
| `ARCHIVE_INVENTORY` | Greška prilikom arhiviranja inventara markica | Error archiving stamp inventory |
| `RESET_INVENTORY` | Greška prilikom resetiranja inventara markica | Error resetting stamp inventory |
| `INVALID_STAMP_TYPE` | Neispravan tip markice: {{type}} | Invalid stamp type: {{type}} |
| `FETCH_MEMBERS_WITH_STAMPS` | Greška prilikom dohvaćanja članova s markicama | Error fetching members with stamps |

### 3.2. Success poruke

| Kod | Hrvatski | Engleski |
|-----|----------|----------|
| `INVENTORY_UPDATED` | Inventar za godinu {{year}} uspješno ažuriran | Inventory for year {{year}} updated successfully |
| `INVENTORY_ARCHIVED` | Inventar markica za godinu {{year}} uspješno arhiviran | Successfully archived stamp inventory for year {{year}} |
| `STAMP_ISSUED` | Markica uspješno izdana članu {{memberId}}, tip: {{type}}, za godinu: {{year}} | Stamp issued successfully for member {{memberId}}, type: {{type}}, for year: {{year}} |
| `STAMP_RETURNED` | Markica vraćena za člana {{memberId}}, tip: {{type}}, za godinu: {{year}} | Stamp returned for member {{memberId}}, type: {{type}}, for year: {{year}} |

### 3.3. Upozorenja

| Kod | Hrvatski | Engleski |
|-----|----------|----------|
| `RESET_DEPRECATED` | Inventar uspješno arhiviran. Funkcionalnost resetiranja je zastarjela, molimo koristite /archive-year endpoint. | Inventory successfully archived. Reset functionality is deprecated, please use /archive-year endpoint instead. |

### 3.4. Tipovi markica

| Kod | Hrvatski | Engleski |
|-----|----------|----------|
| `employed` | zaposleni/nezaposleni | employed/unemployed |
| `student` | dijete/učenik/student | child/pupil/student |
| `pensioner` | umirovljenik | pensioner |

---

## 4. Korištenje u kodu

### 4.1. Import funkcije za prijevod

```typescript
import { tOrDefault } from '../utils/i18n.js';
```

### 4.2. Primjeri korištenja

**Error poruka bez parametara:**
```typescript
throw new DatabaseError(
  tOrDefault('stamp.errors.FETCH_INVENTORY', 'hr', 'Error fetching stamp inventory')
);
```

**Error poruka s parametrima:**
```typescript
throw new Error(
  tOrDefault(
    'stamp.errors.NO_INVENTORY', 
    'hr', 
    'No inventory found for {{type}} stamps for year {{year}}', 
    { type, year: stampYear.toString() }
  )
);
```

**Success poruka:**
```typescript
return { 
  success: true, 
  message: tOrDefault(
    'stamp.success.INVENTORY_ARCHIVED', 
    'hr', 
    'Successfully archived stamp inventory for year {{year}}', 
    { year: year.toString() }
  )
};
```

**Response poruke u routes:**
```typescript
res.status(400).json({ 
  message: tOrDefault('stamp.errors.INVALID_YEAR', 'hr', 'Invalid year parameter') 
});
```

---

## 5. Logirane datoteke

### 5.1. Backend servisi

**`backend/src/services/stamp.service.ts`**
- Sve funkcije za rad s inventarom markica
- Izdavanje i vraćanje markica
- Arhiviranje inventara
- Dohvaćanje povijesti markica
- **Ukupno lokalizirano: 20+ poruka**

### 5.2. Backend rute

**`backend/src/routes/stamp.ts`**
- Validacijske poruke
- HTTP response poruke
- Error handling poruke
- **Ukupno lokalizirano: 15+ poruka**

---

## 6. Testiranje lokalizacije

### 6.1. Testiranje s različitim jezicima

Backend automatski koristi hrvatski jezik (`'hr'`) kao zadani jezik za sve poruke. Za testiranje engleskog jezika, potrebno je:

1. Promijeniti locale parametar u `tOrDefault` pozivima
2. Ili implementirati detekciju jezika iz HTTP headera

### 6.2. Testiranje placeholdera

Sve poruke s placeholderima (`{{variable}}`) trebaju se testirati s realnim vrijednostima:

```typescript
// Testiranje
const message = tOrDefault(
  'stamp.errors.NO_INVENTORY', 
  'hr', 
  'No inventory found for {{type}} stamps for year {{year}}', 
  { type: 'employed', year: '2025' }
);
// Rezultat: "Nema inventara za employed markice za godinu 2025"
```

---

## 7. Dodavanje novih prijevoda

### 7.1. Proces dodavanja

1. **Dodaj ključ u oba jezika:**
   ```json
   // hr/stamp.json
   "errors": {
     "NEW_ERROR_CODE": "Nova poruka greške"
   }
   
   // en/stamp.json
   "errors": {
     "NEW_ERROR_CODE": "New error message"
   }
   ```

2. **Koristi ključ u kodu:**
   ```typescript
   throw new Error(
     tOrDefault('stamp.errors.NEW_ERROR_CODE', 'hr', 'New error message')
   );
   ```

3. **Testiraj u aplikaciji**

### 7.2. Konvencije imenovanja ključeva

- **Error kodovi**: `UPPERCASE_WITH_UNDERSCORES`
- **Prefix po tipu**: `errors.`, `success.`, `warnings.`
- **Namespace**: `stamp.{type}.{code}`

---

## 8. Povezane datoteke

**Servisni sloj:**
- `backend/src/services/stamp.service.ts`

**Rute:**
- `backend/src/routes/stamp.ts`

**Lokalizacijski fajlovi:**
- `backend/src/locales/hr/stamp.json`
- `backend/src/locales/en/stamp.json`

**i18n utility:**
- `backend/src/utils/i18n.ts`

---

## 9. Buduća poboljšanja

1. **Dinamička detekcija jezika** iz HTTP headera (`Accept-Language`)
2. **Frontend lokalizacija** stamp modula
3. **Centralizirani prijevodi** za sve backend module
4. **Validacija prijevoda** - provjeriti da svi ključevi postoje u svim jezicima

---

*Ovaj dokument je kreiran 30. rujna 2025. kao dio lokalizacijskog napora za Promina Drniš aplikaciju.*
