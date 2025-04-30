# Upravljanje članovima

Ovaj modul sadrži komponente i logiku vezanu za upravljanje članovima udruge.

## Terminologija

### Općeniti pojmovi

- **Član** - Osoba koja je formalno povezana s udrugom.
- **Članarina** - Godišnja naknada koju članovi plaćaju udruzi.
- **Period članstva** - Vremensko razdoblje tijekom kojeg je osoba član udruge.

### Statusi članstva

- **ČLANSTVO** - Osnovni status članstva, može biti:
  - **Na čekanju (Pending)** - osoba koja je ispunila prijavnicu, članstvo još nije počelo
  - **Registriran (Registered)** - osoba koja je dobila broj iskaznice i postala dio članstva
  - **Neaktivan (Inactive)** - članstvo prestalo iz nekih razloga

- **Članstvo važeće** - Pokazuje je li članstvo trenutno aktivno (ranije "Aktivan")
- **Aktivnost** - Mjera sudjelovanja člana u aktivnostima, određuje se na temelju broja sati aktivnosti

### Aktivnost i status plaćanja

- **Aktivni član** - Član koji ima plaćenu članarinu i aktivan period članstva
- **Pasivni član** - Član koji nema plaćenu članarinu ili ima neaktivan period članstva

### Napredni statusi članstva

Za detaljan status članstva uzimaju se u obzir sljedeći prioriteti:
1. Smrt člana ima najviši prioritet
2. Isključenje iz članstva ima sljedeći najviši prioritet
3. Dobrovoljno povlačenje
4. Neaktivnost (bez aktivnih perioda)
5. Neplaćena članarina
6. Aktivni član s urednim statusom

## Struktura direktorija

- **components/** - Komponente vezane uz članove
- **hooks/** - React custom hookovi za dohvat i manipulaciju podataka
- **interfaces/** - TypeScript definicije tipova podataka
