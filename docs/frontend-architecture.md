# Frontend arhitektura

Ovaj dokument opisuje arhitekturu frontend dijela Promina Drniš aplikacije, organizaciju koda i principe modularizacije komponenata.

## Opća struktura

Frontend aplikacija koristi React s TypeScriptom i organizirana je prema principu "feature-based architecture" - svaka glavna funkcionalnost ima svoj direktorij.

```
frontend/
├── components/     # Zajedničke komponente koje koriste sve značajke
├── context/        # React konteksti (npr. AuthContext)
├── hooks/          # Zajednički custom hookovi 
├── pages/          # Komponente stranica (routerski prikazi)
├── shared/         # Dijeljeni tipovi i konstante (korišteni i na backendu)
└── src/
    ├── features/   # Glavne funkcionalnosti aplikacije
    │   ├── members/     # Funkcionalnosti vezane uz članove
    │   ├── events/      # Funkcionalnosti vezane uz događaje
    │   └── ...
    ├── utils/      # Pomoćne funkcije
    └── ...
```

## Modularni pristup komponentama

Kod modularizacije komponenata primjenjujemo pristup razdvajanja odgovornosti (separation of concerns) kako bi kod bio čitljiviji, lakši za održavanje i testiranje.

### Struktura feature-a

Svaki feature (funkcionalnost) ima unutarnju strukturu:

```
features/members/
├── components/     # React komponente vezane uz članove
│   ├── MemberTable.tsx              # Prikaz članova
│   ├── MemberListFilters.tsx        # Filteri za listu
│   ├── StatisticsView.tsx           # Prikaz statistike
│   └── README.md                    # Dokumentacija komponenti
├── hooks/          # Custom React hookovi 
│   ├── useMemberData.ts             # Hook za dohvat i manipulaciju podacima
│   ├── useFilteredMembers.ts        # Hook za filtriranje i sortiranje
│   └── README.md                    # Dokumentacija hookova
├── interfaces/     # TypeScript tipovi i sučelja
│   └── memberTypes.ts               # Definicije tipova
└── README.md       # Glavna dokumentacija modula
```

### Razdvajanje prikaza i logike

Komponente se dizajniraju tako da se jasno razdvaja:

1. **Poslovna logika** - izdvojena u custom hookove
2. **UI komponente** - prikazuju podatke i delegiraju akcije
3. **Stanje** - upravlja se lokalno ili kroz kontekste

### Principi modularizacije

1. **Single Responsibility Principle** - svaka komponenta ili hook ima jednu jasnu odgovornost
2. **Props kao komunikacijski kanal** - komponente komuniciraju kroz props, izbjegava se direktna povezanost
3. **Custom Hookovi** - izdvajaju poslovnu logiku, olakšavaju ponovno korištenje i testiranje
4. **Kompozicija komponenata** - složene komponente grade se kompozicijom manjih

## Pravila i konvencije

### Imenovanje

- **Komponente**: PascalCase (npr. `MemberTable.tsx`)
- **Hookovi**: camelCase s "use" prefiksom (npr. `useMemberData.ts`) 
- **Konstante**: UPPER_SNAKE_CASE za globalne vrijednosti
- **Funkcije i varijable**: camelCase

### Struktura komponenata

```tsx
import React from 'react';
// Prvo importi iz React i vanjskih biblioteka
// Zatim importi iz lokalnog projekta

// TypeScript sučelja
interface Props {
  // ...
}

/**
 * Dokumentacijski blok komponente
 */
export const ComponentName: React.FC<Props> = ({ propA, propB }) => {
  // Hookovi i stanje

  // Event handleri i pomoćne funkcije

  // JSX za renderiranje komponente
  return (
    <div>
      {/* ... */}
    </div>
  );
};
```

### Custom Hookovi

```tsx
import { useState, useEffect } from 'react';

/**
 * Dokumentacijski blok hooka
 */
export const useCustomHook = (param: ParamType) => {
  // Stanje i efekti

  // Pomoćne funkcije

  // Povratni objekt s podacima i funkcijama
  return {
    data,
    loading,
    error,
    refreshData
  };
};
```

### Dokumentacija

Svaki modul (feature) trebao bi imati README.md datoteku koja dokumentira:

1. Namjenu modula
2. Glavne komponente i njihovu upotrebu
3. Terminologiju specifičnu za domenu
4. Strukturu i organizaciju koda

## Primjer modularizacije: MemberList komponenta

MemberList komponenta je refaktorirana prema modularnom pristupu:

1. **Razdvajanje logike i prikaza**:
   - `useMemberData` hook sadrži logiku za dohvat i manipulaciju podacima
   - `useFilteredMembers` hook sadrži logiku za filtriranje i sortiranje
   - UI komponente samo prikazuju podatke

2. **Kompozicija manjih komponenata**:
   - `MemberTable` za prikaz podataka u tablici
   - `MemberListFilters` za filtriranje
   - `StatisticsView` za prikaz statistike

3. **Čista komunikacija kroz props**:
   - Podaci se prenose od roditelja prema djeci
   - Događaji (eventi) se prenose od djece prema roditeljima
   - Stanje se čuva na najplićoj potrebnoj razini

## Preporučene prakse

1. **Dokumentiraj kako radi, ne što radi** - kod bi trebao sam objasniti što radi, dokumentacija treba pojasniti kako i zašto
2. **Izbjegavaj dupliranje koda** - koristi zajedničke komponente i hookove 
3. **Držati stanje na najmanjoj mogućoj razini** - minimizirati prenosive podake kroz komponente
4. **Testiranje** - pisati testove za poslovno kritične komponente i hookove
5. **Konzistentnost** - slijediti ustanovljene konvencije kroz cijeli projekt
