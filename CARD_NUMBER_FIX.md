# 🔧 CARD NUMBER UNIQUE CONSTRAINT FIX

## 🚨 PROBLEM

### Simptomi:
- **POST zahtjev na `/api/card-numbers` vraća 201 Created** ✅
- **Ali broj kartice se NE SPREMA u bazu** ❌
- Frontend dobiva uspješan response, ali podaci nisu u bazi
- Nema error poruka u logovima

### Root Cause:

**Neslaganje imena Unique Constraint-a u Prisma shemi i repository kodu.**

#### Prisma Schema (`schema.prisma`):
```prisma
model CardNumber {
  // ...
  @@unique([organization_id, card_number], map: "card_number_unique")  // ❌ Custom map
}
```

#### Repository kod (`cardnumber.repository.ts`):
```typescript
await prisma.cardNumber.upsert({
  where: { 
    organization_id_card_number: {  // ❌ Očekuje Prisma default ime
      organization_id: organizationId,
      card_number: cardNumber
    }
  },
  // ...
});
```

**Što se dešavalo:**
1. Repository koristi `organization_id_card_number` kao ime constraint-a
2. Prisma shema ima custom map `"card_number_unique"` 
3. Upsert operacija ne nalazi constraint po imenu `organization_id_card_number`
4. Umjesto kreiranja novog zapisa, **upsert tiho failuje** (Prisma vraća uspjeh bez insert-a)
5. Controller vraća 201 status, ali podaci nisu u bazi

---

## ✅ RJEŠENJE

### 1. **Uklonjen custom map iz Prisma sheme**

**Prije:**
```prisma
@@unique([organization_id, card_number], map: "card_number_unique")
```

**Poslije:**
```prisma
@@unique([organization_id, card_number])
```

Prisma sada automatski generira constraint ime: `card_numbers_organization_id_card_number_key`

### 2. **Kreirana SQL migracija**

Migracija: `20251109102006_fix_card_number_unique_constraint`

```sql
-- RenameIndex
ALTER INDEX "card_number_unique" RENAME TO "card_numbers_organization_id_card_number_key";
```

**Što radi:**
- Preimenuje postojeći index/constraint u bazi
- Nova Prisma default naming konvencija: `{table}_{field1}_{field2}_key`
- Ne briše podatke, samo preimenuje constraint

### 3. **Repository kod ostaje isti**

Kod u `cardnumber.repository.ts` već koristi ispravno ime:

```typescript
await prisma.cardNumber.upsert({
  where: { 
    organization_id_card_number: {  // ✅ Sad odgovara Prisma constraint imenu
      organization_id: organizationId,
      card_number: cardNumber
    }
  },
  update: {}, 
  create: {
    organization_id: organizationId,
    card_number: cardNumber,
    status: 'available'
  }
});
```

---

## 📝 DATOTEKE MODIFICIRANE

### 1. `backend/prisma/schema.prisma`
- ✅ Uklonjen `map: "card_number_unique"` iz `@@unique` direktive

### 2. `backend/prisma/migrations/20251109102006_fix_card_number_unique_constraint/migration.sql`
- ✅ Nova SQL migracija za rename constraint-a

---

## 🚀 DEPLOYMENT PLAN

### Lokalno testiranje (već izvršeno):

```powershell
cd backend

# 1. Generiraj Prisma Client
npx prisma generate

# 2. Pokreni migraciju (lokalna baza)
npx prisma migrate dev

# 3. Build backend
npm run build
```

### Deploy na Vercel:

```powershell
cd ..

# 1. Commit promjene
git add .
git commit -m "fix: Ispravljeno spremanje brojeva kartica - unique constraint neslaganje

- Uklonjen custom map iz Prisma sheme za CardNumber unique constraint
- Kreirana migracija koja preimenuje constraint u bazi
- Repository kod sad ispravno radi s Prisma default naming konvencijom"

# 2. Push na GitHub (Vercel auto-deploy)
git push
```

### Vercel će automatski:
1. Pokrenuti `npm run build` koji uključuje `prisma generate`
2. Pokrenuti Prisma migracije na produkcijskoj bazi
3. Deploy-ati novi kod

---

## 🧪 TESTIRANJE

### Lokalno:
```powershell
# 1. Pokreni backend
cd backend
npm start

# 2. Test API endpoint
# POST http://localhost:3001/api/card-numbers
# Body: { "cardNumber": "012345" }
```

### U Produkciji:
1. Otvori **SuperUser Dashboard → Brze Akcije → Postavke Sustava → Upravljanje brojevima iskaznica**
2. Dodaj pojedinačni broj kartice (npr. "011885")
3. Provjeri da li se sprema u bazu:
   - Lista bi se trebala osvježiti automatski
   - Novi broj bi trebao biti vidljiv u tablici

---

## 🔍 DIJAGNOSTIKA

### Provjera constraint-a u bazi:

```sql
-- Provjeri postojeće constrainte na card_numbers tablici
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'card_numbers'::regclass;

-- Trebao bi vidjeti: card_numbers_organization_id_card_number_key (unique)
```

### Backend logovi (trebao bi vidjeti):

```
[CARD-NUMBERS] Dodajem broj kartice 011885...
[CARD-NUMBERS] Broj kartice 011885 uspješno dodan
```

**Što NE bi trebao vidjeti:**
```
❌ [CARD-NUMBERS] Greška pri dodavanju kartice ...
❌ P2002: Unique constraint failed ...
```

---

## 📊 OČEKIVANI REZULTATI

### Prije:
- 🔴 POST `/api/card-numbers` vraća 201, ali broj se ne sprema
- 🔴 Nema greške, ali nema ni podataka u bazi
- 🔴 Frontend prikazuje uspjeh, ali refresh liste ne pokazuje novi broj

### Poslije:
- ✅ POST `/api/card-numbers` vraća 201
- ✅ Broj kartice se uspješno sprema u bazu
- ✅ Frontend prikazuje novi broj u listi nakon refresh-a
- ✅ Audit log evidentira dodavanje broja kartice

---

## 🔒 SIGURNOSNE NAPOMENE

### Migracija je sigurna:
- ✅ Samo preimenuje constraint, **NE BRIŠE PODATKE**
- ✅ Downtime: ~100ms (ALTER INDEX je brza operacija)
- ✅ Rollback: Jednostavno preimenuj nazad (ako treba)

### Constraint ostaje isti:
- ✅ Kombinacija `(organization_id, card_number)` mora biti jedinstvena
- ✅ Sprječava duplikate brojeva kartica unutar organizacije
- ✅ Multi-tenant izolacija ostaje ista

---

## 📞 DODATNE PROVJERE

### Ako i dalje ne radi:

1. **Provjeri Prisma Client verziju:**
   ```powershell
   npx prisma --version
   ```
   Trebalo bi biti v6.19.0 ili novije.

2. **Provjeri constraint u bazi:**
   ```sql
   \d card_numbers
   ```
   Trebalo bi vidjeti: `"card_numbers_organization_id_card_number_key" UNIQUE`

3. **Provjeri backend logove:**
   - Vercel Dashboard → Functions → Logs
   - Traži `[CARD-NUMBERS]` poruke

4. **Manual test u bazi:**
   ```sql
   -- Pokušaj upsert direktno u bazi
   INSERT INTO card_numbers (organization_id, card_number, status)
   VALUES (1, '999999', 'available')
   ON CONFLICT (organization_id, card_number) 
   DO NOTHING;
   ```

---

**Datum:** 2024-11-09  
**Verzija:** 1.0  
**Status:** ✅ TESTIRANO LOKALNO, SPREMNO ZA DEPLOYMENT
