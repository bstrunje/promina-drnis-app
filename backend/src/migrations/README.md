# Migracije baze podataka

Ovaj direktorij sadrži migracije za strukturu baze podataka aplikacije Promina Drniš.

## Dostupne migracije

### add_member_nickname.ts
Dodaje polje `nickname` (nadimak) u tablicu `members`.

**Dodan:** 2025-05-03

**Opis:** 
- Dodaje VARCHAR(50) polje `nickname` u tablicu članova
- Ovo polje je opcionalno i omogućuje članovima da dodaju osobni nadimak
- Nadimak se prikazuje uz puno ime člana u formatu "Ime Prezime - nadimak"
- Korisno za identifikaciju članova s istim imenom i prezimenom

**Utjecaj na postojeće podatke:**
- Nema negativnog utjecaja na postojeće podatke
- Postojeći članovi neće imati nadimak dok ga sami ne dodaju
- Polje je potpuno kompatibilno s prethodnom verzijom baze

## Format prikaza nadimka

Nadimak se prikazuje na sljedeći način:
- U profilu člana: "Ime Prezime - nadimak"
- U tablici članova: "Ime Prezime - nadimak"
- U polju za pretragu: "Ime Prezime - nadimak"

## Migriranje produkcijske baze

Izvršite sljedeću komandu za primjenu migracija na produkcijskoj bazi:

```bash
node dist/runMigrations.js
```

Migracije se automatski izvršavaju redoslijedom definiranim u `runMigrations.ts` datoteci.
