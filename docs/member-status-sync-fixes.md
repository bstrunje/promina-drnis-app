# Ispravke u sustavu sinkronizacije statusa članova

## Pregled problema

Sustav za sinkronizaciju statusa članova imao je nekoliko problema koji su onemogućavali pravilno funkcioniranje:

1. Pogrešno korištenje middleware-a za autorizaciju u admin rutama
2. Neispravni pozivi audit servisa
3. Problemi s tipovima u testovima i mockovima
4. Nekonzistentni odgovori API-ja u slučaju greške
5. Pogrešna imena tablica u SQL upitu

## Implementirane ispravke

### 1. Ispravka middleware-a za autorizaciju

U datoteci `admin.status.ts` zamijenjen je nepostojeći `authMiddleware.requireAdmin` s ispravnim `roles.requireAdmin`:

```typescript
// Prije:
router.post('/sync-member-statuses', authMiddleware.requireAdmin, async (req, res) => {
  // ...
});

// Nakon:
router.post('/sync-member-statuses', roles.requireAdmin, async (req, res) => {
  // ...
});
```

### 2. Ispravka poziva audit servisa

U `memberStatusSync.service.ts` ispravljen je poziv `auditService.logAction` da odgovara stvarnoj definiciji funkcije:

```typescript
// Prije:
await auditService.logAction(
  'member_status_sync',
  req.user?.member_id,
  actionDetails,
  req
);

// Nakon:
await auditService.logAction(
  'member_status_sync',
  req.user?.member_id || null,
  actionDetails,
  req,
  'success',
  member.member_id
);
```

### 3. Ispravka testova i mockova

U testovima su napravljene sljedeće ispravke:

- Mockovi za Prisma objekte sada vraćaju realistične objekte koji odgovaraju očekivanim tipovima
- Dodan je mock za `cleanTestDb` funkciju kako bi se izbjegla greška u testovima
- Ispravljen je mock za `roles.requireAdmin` umjesto `authMiddleware.requireAdmin`

```typescript
// Primjer ispravke mocka za Prisma:
prisma.member.update.mockResolvedValue({
  member_id: 1,
  full_name: 'Test User 1',
  status: 'registered',
  registration_completed: true,
  // ostala polja...
});
```

### 4. Konzistentnost odgovora API-ja

U `admin.status.ts` dodano je polje `updatedCount` u sve odgovore, uključujući slučajeve greške:

```typescript
// Prije:
res.status(500).json({
  success: false,
  message: result.message
});

// Nakon:
res.status(500).json({
  success: false,
  message: result.message,
  updatedCount: result.updatedCount
});

// Također za slučaj iznimke:
res.status(500).json({
  success: false,
  message: `Greška pri sinkronizaciji statusa članova: ${error instanceof Error ? error.message : 'Nepoznata greška'}`,
  updatedCount: 0
});
```

### 5. Ispravka SQL upita

U `memberStatusSync.service.ts` ispravljen je SQL upit da koristi ispravna imena tablica prema Prisma shemi:

```typescript
// Prije:
const membersToUpdate = await prisma.$queryRaw`
  SELECT m.member_id, m.full_name, m.status, m.registration_completed, md.card_number
  FROM member m
  JOIN membership_details md ON m.member_id = md.member_id
  WHERE (m.status != 'registered' OR m.registration_completed = false)
    AND md.card_number IS NOT NULL 
    AND md.card_number != ''
    AND m.role != 'member_superuser'
`;

// Nakon:
const membersToUpdate = await prisma.$queryRaw`
  SELECT m.member_id, m.full_name, m.status, m.registration_completed, md.card_number
  FROM members m
  JOIN membership_details md ON m.member_id = md.member_id
  WHERE (m.status != 'registered' OR m.registration_completed = false)
    AND md.card_number IS NOT NULL 
    AND md.card_number != ''
    AND m.role != 'member_superuser'
`;
```

## Rezultati

Nakon implementacije svih navedenih ispravki:

1. Svi testovi uspješno prolaze
2. API endpoint `/api/admin/sync-member-statuses` ispravno funkcionira
3. Sinkronizacija statusa članova radi prema očekivanju
4. Audit zapisi se pravilno bilježe

## Preporuke za buduće održavanje

1. Uvijek koristiti `roles.requireAdmin` za zaštitu admin ruta
2. Osigurati da svi mockovi u testovima vraćaju objekte koji odgovaraju stvarnim tipovima
3. Koristiti ispravna imena tablica u SQL upitima prema Prisma shemi
4. Održavati konzistentnost u API odgovorima, posebno u slučajevima greške
5. Redovito pokretati testove kako bi se osiguralo da sve funkcionalnosti rade ispravno

## Datum implementacije

6. lipnja 2025.
