# Proces sinkronizacije tipova

## Pregled

Promina Drniš aplikacija koristi TypeScript za potpunu tip sigurnost kroz cijelu aplikaciju - od frontenda do backenda. Kako bi se osigurala konzistentnost podataka i izbjegla dupliciranja, implementiran je proces sinkronizacije tipova između frontenda i backenda.

## Izvor istine (Source of Truth)

Frontend direktorij `frontend/shared/types` služi kao izvor istine za sve zajedničke tipove. Ovaj pristup omogućuje:

- Centralizirano definiranje tipova
- Konzistentnost između frontenda i backenda
- Lakše održavanje
- Manje vjerojatnosti za greške uslijed neusklađenosti tipova

## Struktura direktorija

```
promina-drnis-app/
├── frontend/
│   ├── shared/
│   │   └── types/         # IZVOR ISTINE za tipove
│   │       ├── activity.ts
│   │       ├── auth.ts
│   │       ├── member.ts
│   │       ├── membership.ts
│   │       ├── memberStatus.types.ts
│   │       └── ...
│
├── backend/
│   ├── src/
│   │   ├── shared/
│   │   │   └── types/     # Sinkronizirani tipovi s frontenda
│   │   │       ├── activity.ts
│   │   │       ├── auth.ts
│   │   │       ├── member.ts
│   │   │       ├── membership.ts
│   │   │       ├── memberStatus.types.ts
│   │   │       └── ...
```

## Proces ručne sinkronizacije

Sinkronizacija tipova se trenutno obavlja ručno zbog specifičnih prilagodbi koje mogu biti potrebne za backend. Proces je sljedeći:

1. **Razvoj i ažuriranje tipova**:
   - Sve promjene tipova MORAJU se prvo implementirati u `frontend/shared/types`
   - Tipovi trebaju biti pravilno dokumentirani s JSDoc komentarima

2. **Kopiranje u backend**:
   - Nakon što su tipovi finalizirani u frontendu, ručno se kopiraju u `backend/src/shared/types`
   - Važno je zadržati istu strukturu datoteka i imena

3. **Backend specifične prilagodbe**:
   - Ponekad backend zahtijeva male prilagodbe tipova (npr. za Prisma ORM specifičnosti)
   - Takve prilagodbe su dozvoljene, ali trebaju biti minimalne i dobro dokumentirane

4. **Verifikacija**:
   - Nakon sinkronizacije, pokrenite `npm run build` kako biste provjerili jesu li tipovi ispravno usklađeni
   - Rješavanje eventualnih TypeScript grešaka
   - **Prilikom migracije na enum tipove (npr. MembershipTypeEnum), obavezno provjeriti i zamijeniti sve string literal vrijednosti u kodu s odgovarajućim enum vrijednostima!**

## Važna razmatranja

### Alias konfiguracija

Frontend i backend imaju različite konfiguracije za aliase putanja (path aliases):

**Frontend (vite.config.ts)**:
```typescript
alias: {
  '@': path.resolve(__dirname, './src'),
  '@shared': path.resolve(__dirname, './shared/types'),
  '@components': path.resolve(__dirname, './components')
}
```

**Frontend (tsconfig.json)**:
```json
"paths": {
  "@/*": ["src/*"],
  "@shared/*": ["shared/types/*"],
  "@components/*": ["components/*"]
}
```

**Backend (tsconfig.json)**:
```json
"paths": {
  "@/*": ["src/*"]
}
```

### Osiguravanje konzistentnosti

Kod promjena tipova obratite pažnju na:

1. **Obratno kompatibilnost**: Izmjene tipova ne bi trebale "slomiti" postojeći kod
2. **Nullability**: Pripazite na null i undefined vrijednosti, posebno kod opcionalna polja
3. **Ugnježđene strukture**: Budite posebno oprezni kod kompleksnih tipova s ugnježdenim strukturama

## Česte greške i rješenja

### Problem: TypeScript alias greške

```
TS2307: Cannot find module '@shared/member' or its corresponding type declarations.
```

**Rješenje**: Provjerite jesu li aliasi konzistentno konfigurirani u `vite.config.ts` i `tsconfig.json`. Alias putanja u oba fajla mora pokazivati na istu lokaciju.

### Problem: Nedostajuća svojstva u tipu

```
TS2339: Property 'next_year_stamp_issued' does not exist on type 'Member'.
```

**Rješenje**: Provjerite jesu li ažurirani tipovi sinkronizirani između frontenda i backenda. Ako je svojstvo dodano u frontend, mora se dodati i u backend definiciju.

### Problem: Konflikt modula

```
TS2403: Subsequent variable declarations must have the same type.
```

**Rješenje**: Provjerite da nema konfliktnih definicija za isti tip između modula. Može biti uzrokovano dupliciranim importima ili pogrešnom strukturom modula.

## Najbolje prakse

1. **Dokumentirajte sve tipove** - Koristite JSDoc komentare za opisivanje svakog tipa i svojstva
2. **Preferirajte interfaces nad types** - Za objekte koji mogu biti prošireni
3. **Održavajte čistu strukturu** - Jedan tip po datoteci za velike tipove, grupiranje povezanih malih tipova
4. **Izbjegavajte any** - Koristite unknown ili specificnije tipove kad god je moguće
5. **Minimalne promjene** - Izbjegavajte velike refaktoring operacije koje utječu na mnoge tipove odjednom

## Budući planovi za poboljšanje procesa

Trenutno se razmatra implementacija automatiziranog procesa sinkronizacije pomoću:

1. **NPM skripte** - Koja bi automatski kopirala i prilagodila tipove
2. **Monorepo strukture** - Potencijalno restrukturiranje projekta kako bi se omogućilo dijeljenje tipova kao zasebni paket

## Zaključak

Proces sinkronizacije tipova je ključan za održavanje integriteta podataka kroz cijelu aplikaciju. Iako je trenutni proces manualan, disciplinirano slijeđenje ovih smjernica osigurava konzistentnost i reducira vjerojatnost pojave grešaka povezanih s tipovima.
