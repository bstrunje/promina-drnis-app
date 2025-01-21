# Backend Shared Types

## Overview
Ovo su TypeScript tipovi koji se koriste u backend dijelu aplikacije. Tipovi su sinkronizirani s `frontend/shared/types` koji služi kao izvor istine (source of truth).

## Struktura
```
backend/
└── src/
    └── shared/
        └── types/
            ├── user.types.ts
            ├── auth.types.ts
            └── ...
```

## Proces sinkronizacije
1. Sve promjene tipova prvo napraviti u `frontend/shared/types`
2. Ručno kopirati potrebne tipove u `backend/src/shared/types`
3. Prilagoditi tipove backend specifičnostima ako je potrebno
4. Provjeriti kompilaciju s `npm run typecheck`

## Važne napomene
- Ne modificirati tipove direktno u backend/src/shared/types
- Sve promjene prvo napraviti u frontend/shared/types
- Održavati dokumentaciju za svaki tip u TypeScript fajlovima