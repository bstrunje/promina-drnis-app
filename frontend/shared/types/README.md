# Frontend Shared Types

## Overview
Ovo su TypeScript tipovi koji služe kao izvor istine (source of truth) za cijelu aplikaciju. Tipovi se automatski sinkroniziraju s `backend/src/shared/types` putem GitHub Actions radnog toka.

## Struktura
```
frontend/
└── shared/
    └── types/
        ├── member.ts
        ├── auth.ts
        └── ...
```

## Proces sinkronizacije
1. Sve promjene tipova napraviti isključivo u `frontend/shared/types`
2. GitHub Actions automatski kopira tipove u `backend/src/shared/types` nakon push-a na main/develop granu
3. Automatska sinkronizacija se pokreće kada se promijeni bilo koji fajl u `frontend/shared/types` direktoriju

## Važne napomene
- Ne modificirati tipove direktno u backend/src/shared/types
- Sve promjene isključivo raditi u frontend/shared/types
- Održavati dokumentaciju za svaki tip u TypeScript fajlovima
- Ručnu sinkronizaciju nije potrebno raditi - sustav to radi automatski
- GitHub workflow se može i ručno pokrenuti kroz GitHub sučelje ako je potrebno