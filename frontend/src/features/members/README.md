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

- **Aktivni član (prema satima)** - Član koji ima 20 ili više sati aktivnosti
- **Pasivni član (prema satima)** - Član koji ima manje od 20 sati aktivnosti
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

## Funkcionalnosti

### Lista članova
- Prikaz svih članova društva u tablici
- Filtriranje po imenu, statusu aktivnosti, dobi
- Sortiranje po imenu ili satima aktivnosti
- Statistički pregled članstva po raznim kategorijama
- Prilagođeni ispis liste članova za skupštinu
- Responzivan dizajn prilagođen za mobilne uređaje

### Upisna lista za skupštinu
Poseban format ispisa koji uključuje:
- Zaglavlje s nazivom društva
- Ukupan broj članova, broj aktivnih i neaktivnih članova
- Datum generiranja
- Tablicu s kolonama: redni broj, ime člana, sati aktivnosti i prostor za potpis
- Automatsko obrojčavanje članova s resetiranjem brojača između aktivnih i neaktivnih članova
- Optimizirano za ispis na papiru (bez navigacijskih elemenata)
- Automatsko razdvajanje članova na dvije skupine:
  - **Aktivni** - članovi s 20 ili više sati aktivnosti
  - **Pasivni** - članovi s manje od 20 sati aktivnosti
- Čisto formatiranje bez praznih prostora između zaglavlja i tablice

### Prikaz sati aktivnosti
- Sati aktivnosti članova prikazuju se iz dva izvora:
  - U tablici članova (_Member List/Member Table_) - izračunavaju se iz tablice `activity_participants` na bazi potvrđenih aktivnosti
  - U profilu člana (_Member Profile_) - prikazuju se iz kolone `total_hours` u tablici `members`
- Kod dodavanja ili uklanjanja člana iz aktivnosti, ažuriraju se oba izvora

### Statistika članova
- Prikaz distribucije članova po dobnim skupinama (5-godišnji intervali)
- Prikaz distribucije po statusu članstva
- Prikaz distribucije po spolu
- Prikaz distribucije po kategoriji članstva

### Prilagodbe za mobilne uređaje
- Optimiziran prikaz na manjim ekranima
- Prilagođen navigacijski izbornik s kraćim nazivima
- Poboljšana interakcija s tablicom članova na dodir
- Promjena prikaza filtera za optimalno korištenje na mobilnim uređajima
- Mogućnost povlačenja za osvježavanje (pull-to-refresh)

## Struktura direktorija

- **components/** - Komponente vezane uz članove
- **hooks/** - React custom hookovi za dohvat i manipulaciju podataka
- **interfaces/** - TypeScript definicije tipova podataka
