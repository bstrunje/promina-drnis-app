# Pravila za rad s Prisma enumima u TypeScript kodu

## Definicija pristupa

Kada radite s Prisma enumima u TypeScript kodu, koristite sljedeća pravila:

### 1. Koristite string literale umjesto importa enuma

```typescript
// Ne koristite:
import { SenderType } from '@prisma/client';

// Umjesto toga, koristite string literale
const senderType = 'member_administrator'; // ili 'member', 'member_superuser', itd.
```

### 2. Definirajte tipove lokalno kad je potrebno

```typescript
// Ovako: 
sender_type: 'member' | 'member_administrator' | 'member_superuser';

// Ne ovako:
sender_type: SenderType;
```

### 3. Za Prisma upite koristite string vrijednosti

```typescript
// Ovako:
where: { sender_type: { in: ['member_administrator', 'member_superuser'] } }

// Ne ovako:
where: { sender_type: { in: [SenderType.admin, SenderType.superuser] } }
```

### 4. Za dinamičke vrijednosti koristite ternarne operatore s string literalima

```typescript
// Ovako:
const senderType = req.user?.role_name === 'member_superuser' ? 'member_superuser' : 'member_administrator';

// Ne ovako:
const senderType = req.user?.role_name === 'superuser' ? SenderType.superuser : SenderType.admin;
```

### 5. Nakon promjena Prisma sheme, uvijek pokrenite `npx prisma generate`

- Ovo je potrebno da bi Prisma klijent imao ažurirane tipove
- Ne generirajte nove migracije za manje promjene tipova

## Prednosti pristupa

Ovaj pristup osigurava:
- Čist kod bez TypeScript grešaka
- Punu kompatibilnost s Prisma ORM-om
- Lako dodavanje novih enum vrijednosti u budućnosti
- Izbjegavanje problema s importom koji se često javljaju s Prisma enumima
