# Pravila za praćenje sati aktivnosti i članstva

## Datum kreiranja: 30. rujan 2025.

Ovaj dokument opisuje ažurirana pravila za praćenje sati aktivnosti članova i automatsko završavanje članstava.

---

## 1. Prikaz sati aktivnosti u profilu člana

### 1.1. Status aktivnosti komponenta (`MemberActivityStatus`)

**Što se prikazuje:**
- Prikazuje **samo aktivnosti iz zadnje 2 godine** (tekuća godina + prethodna godina)
- Koristi polje `activity_hours` iz tablice `members`

**Poseban slučaj - završeno članstvo:**
- Ako je status člana `inactive` (završeno članstvo), prikazuje **0 sati**
- To znači da član nema aktivno članstvo i ne računa mu se status aktivnosti

**Kriteriji statusa:**
- **Aktivan** - ≥ 20 sati u zadnje 2 godine
- **Pasivan** - < 20 sati u zadnje 2 godine

**Implementacija:**
```typescript
// frontend/components/MemberActivityStatus.tsx
const activityMinutes = member.status === 'inactive' ? 0 : (member.activity_hours ?? 0);
const activityHours = activityMinutes / 60;
```

---

## 2. Povijesni pregled aktivnosti

### 2.1. ActivityOverviewPage - Sve godine vidljive

**Što se prikazuje:**
- **SVE godine** u kojima je član imao aktivnosti (bez filtriranja)
- Za svaku godinu: ukupan broj aktivnosti i ukupni sati

**Ukupni sati kroz povijest:**
- Izračunavaju se **zbrajanjem sati iz svih godina**
- **NE koriste se** `total_hours` iz tablice `members` (jer se više ne ažuriraju)
- Sati se dohvaćaju iz `annual_statistics` tablice za svaku godinu

**Implementacija:**
```typescript
// frontend/src/features/activities/ActivityOverviewPage.tsx
const totalHoursThroughHistory = annualStats.reduce((sum, stat) => {
  const hours = typeof stat.total_hours === 'number' ? stat.total_hours : Number(stat.total_hours);
  return sum + hours;
}, 0);
```

**Zašto se ne koriste `total_hours` iz `members` tablice?**
- Polje `total_hours` u `members` tablici NE ažurira se više automatski
- Zadržava se samo za legacy kompatibilnost
- Stvarni izvor istine su podaci u `annual_statistics` tablici

---

## 3. Automatsko završavanje članstava

### 3.1. Trigger za provjeru isteklih članstava

**Kada se pokreće:**
- Automatski svaki dan u **ponoć** (00:00) putem cron job-a
- Ručno putem debug buttona (samo u development modu)

**Što se provjerava:**
- Je li trenutni datum **nakon 1. ožujka** tekuće godine
- Ako jest, provjeravaju se sva članstva koja nisu obnovljena za tu godinu

**Što se događa kada članstvo istekne:**
1. **Status člana** se postavlja na `inactive`
2. **`total_hours` SE NE PONIŠTAVAJU** - ostaju trajno evidentirani
3. **Završava se aktivno razdoblje** članstva u `membership_periods` tablici
4. **Razlog završetka** se postavlja na `non_payment`

**Implementacija:**
```typescript
// backend/src/repositories/membership.repository.ts
await tx.member.updateMany({
  where: {
    member_id: { in: memberIdsToExpire }
  },
  data: {
    status: 'inactive'
    // total_hours se NE diraju!
  }
});
```

### 3.2. Debug button za testiranje

**Gdje se nalazi:**
- U `MembershipFeeSection` komponenti
- Vidljiv samo u **development modu** (`import.meta.env.DEV`)
- Dostupan samo korisnicima s admin privilegijama

**Što radi:**
- Omogućuje ručno pokretanje provjere isteklih članstava
- Koristi mock datum iz `localStorage` ako postoji
- Prikazuje rezultat i reload-a stranicu

---

## 4. Iznimke od pravila

### 4.1. Superuser uvijek aktivan

**Pravilo:**
- Članovi s ulogom `member_superuser` mogu se prijaviti **bez obzira na članarinu**
- Ne provjerava se je li plaćena članarina
- Ne provjerava se status aktivnosti

**Implementacija:**
```typescript
// backend/src/controllers/auth/login.handler.ts
if (memberStatus.role !== 'member_superuser') {
  // Provjere članarine i statusa
}
```

---

## 5. Tehnička implementacija

### 5.1. Polja u bazi podataka

**Tablica `members`:**
- `activity_hours` (INTEGER) - Sati aktivnosti za zadnje 2 godine (tekuća + prošla)
- `total_hours` (INTEGER) - **LEGACY polje** - više se ne ažurira automatski, ostaje za povijest
- `status` (ENUM) - Status člana: `registered`, `inactive`, `pending`

**Tablica `annual_statistics`:**
- `member_id` - ID člana
- `year` - Godina
- `total_hours` (DECIMAL) - Ukupni sati za tu godinu
- `total_activities` (INTEGER) - Broj aktivnosti
- `calculated_at` (TIMESTAMP) - Kada je izračunato

**Tablica `membership_periods`:**
- `member_id` - ID člana
- `start_date` - Datum početka članstva
- `end_date` - Datum završetka (NULL ako je aktivno)
- `end_reason` - Razlog završetka (`non_payment`, `voluntary`, itd.)

### 5.2. Servisi i funkcije

**Backend:**
- `membership.repository.ts::expireMembershipsForYear()` - Završava istekla članstva
- `member.service.ts::getMemberAnnualStats()` - Dohvaća statistiku po godinama

**Frontend:**
- `MemberActivityStatus.tsx` - Prikazuje status aktivnosti (zadnje 2 godine)
- `ActivityOverviewPage.tsx` - Prikazuje sve godine i ukupne sate kroz povijest

---

## 6. Dijagram toka - Završavanje članstva

```
[Cron Job - Ponoć]
    ↓
[Provjera: Je li datum > 1. ožujka?]
    ↓ DA
[Dohvati članove čija članarina nije plaćena]
    ↓
[Za svakog člana:]
    ├─ Postavi status = 'inactive'
    ├─ Zadrži total_hours (NE poništavaj)
    └─ Završi aktivno razdoblje u membership_periods
    ↓
[Osiguraj da su svi superuseri aktivni]
```

---

## 7. Pitanja i odgovori

**Q: Što se događa s `total_hours` kada članstvo istekne?**  
A: Ništa. `total_hours` ostaju **netaknuti** i vidljivi kroz povijest.

**Q: Gdje se prikazuju ukupni sati kroz povijest?**  
A: Na `ActivityOverviewPage` stranici, zbrojeni iz svih godina u `annual_statistics` tablici.

**Q: Zašto se više ne koristi `total_hours` iz `members` tablice?**  
A: Jer se to polje više ne ažurira automatski. Stvarni izvor istine je `annual_statistics` tablica.

**Q: Može li se član prijaviti ako mu je isteklo članstvo?**  
A: Ne, osim ako je `member_superuser`.

**Q: Kada se resetira `activity_hours`?**  
A: Automatski se ažurira kada se izračunavaju godišnje statistike. Ne resetira se ručno.

---

## 8. Povezana dokumentacija

- `annual-statistics.md` - Detalji o sustavu godišnje statistike
- `auth-system.md` - Pravila autentikacije i autorizacije
- `membership-fee-tracking.md` - Praćenje plaćanja članarine

---

*Ovaj dokument je kreiran 30. rujna 2025. i odražava trenutnu implementaciju sustava.*
