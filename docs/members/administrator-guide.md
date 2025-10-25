# Administrator Guide - Vodič za administratore

**Uloga:** `member_administrator`  
**Pristup:** Upravljanje članovima, aktivnostima i organizacijskim funkcionalnostima

---

## 🎯 Pregled

Kao administrator organizacije, imate ovlasti za upravljanje članovima, kreiranje aktivnosti, upravljanje markicama i opremom, te slanje poruka članovima. Ne možete mijenjati sistemske postavke ili dodijeliti administratorske uloge.

---

## 🚀 Admin Dashboard

Dashboard administratora prikazuje:

### 📊 Statistike
- **Ukupno članova** - Broj registriranih članova
- **Aktivni članovi** - Članovi s plaćenom članarinom
- **Nadolazeće aktivnosti** - Planirane aktivnosti
- **Nepročitane poruke** - Poruke koje trebate pročitati

### 🔗 Brza navigacija
- **Upravljanje članovima** - Dodavanje, uređivanje članova
- **Aktivnosti** - Kreiranje i upravljanje aktivnostima
- **Poruke** - Slanje poruka članovima
- **Izvještaji** - Statistike i izvještaji

---

## 👥 Upravljanje članovima

### Dodavanje novih članova
1. **Admin Dashboard** → **Upravljanje članovima**
2. Kliknite **Dodaj novog člana**
3. Unesite osnovne podatke:
   - Ime, prezime, nadimak
   - Email i telefon
   - Datum rođenja
   - Životni status (zaposlenik, student, umirovljenik)
   - Spol
4. **Spremi** - Član se dodaje s statusom "pending"

### Upravljanje postojećim članovima
- **Pregled članova** - Lista svih članova s filterima
- **Uređivanje podataka** - Ažuriranje informacija o članu
- **Promjena statusa** - Aktiviranje/deaktiviranje članova
- **Dodjela lozinki** - Postavljanje lozinki za nove članove

### Filtriranje članova
- **Status** - Aktivni, neaktivni, pending
- **Uloga** - Member, administrator, superuser
- **Životni status** - Zaposlenik, student, umirovljenik
- **Pretraživanje** - Po imenu, prezimenu ili emailu

### Registracija članova
1. **Pending članovi** - Lista članova koji čekaju registraciju
2. **Dodjela lozinke** - Postavite početnu lozinku
3. **Dodjela kartice** - Dodijelite broj članske kartice
4. **Aktivacija** - Član postaje aktivan i može se prijaviti

---

## 🏃‍♂️ Upravljanje aktivnostima

### Kreiranje nove aktivnosti
1. **Aktivnosti** → **Kreiraj novu aktivnost**
2. Osnovni podaci:
   - **Naziv aktivnosti**
   - **Tip aktivnosti** - Izlet, edukacija, održavanje, ostalo
   - **Datum i vrijeme**
   - **Lokacija**
   - **Opis aktivnosti**
3. Postavke:
   - **Maksimalan broj sudionika**
   - **Postotak priznavanja sati** (osim za izlete)
   - **Potrebne vještine**
4. **Dodaj sudionike** - Odaberite članove koji sudjeluju

### Upravljanje postojećim aktivnostima
- **Pregled aktivnosti** - Lista svih aktivnosti
- **Uređivanje** - Možete uređivati samo aktivnosti koje ste kreirali
- **Otkazivanje** - Možete otkazati aktivnosti koje ste kreirali
- **Brisanje** - Samo superuser može brisati aktivnosti

### Uloge u izletima
- **Vodič** - Odgovoran za vođenje (100% sati)
- **Pomoćni vodič** - Pomaže vodiču (50% sati)  
- **Vozač** - Vozi vozilo (100% sati)
- **Sudionik** - Sudjeluje u aktivnosti (10% sati)

### Završavanje aktivnosti
1. **Označite aktivnost kao završenu**
2. **Potvrda sudionika** - Potvrdite tko je stvarno sudjelovao
3. **Automatsko ažuriranje sati** - Sustav automatski računa sate

---

## 📬 Sustav poruka

### Slanje poruka
1. **Poruke** → **Pošalji novu poruku**
2. Odaberite primatelje:
   - **Pojedinačni član** - Poruka jednom članu
   - **Grupa članova** - Odaberite više članova
   - **Svi članovi** - Poruka svim članovima organizacije
3. **Naslov i sadržaj** - Napišite poruku
4. **Pošalji** - Poruka se odmah dostavlja

### Upravljanje porukama
- **Poslane poruke** - Pregled poruka koje ste poslali
- **Primljene poruke** - Poruke upućene vama
- **Status dostave** - Vidite tko je pročitao poruku

---

## 🎫 Upravljanje članstvom

### Članarine
- **Pregled plaćanja** - Status plaćanja članarine po članovima
- **Označavanje plaćanja** - Označite kad je članarina plaćena
- **Upravljanje članstvom** - Aktiviranje/deaktiviranje članstava

### Markice
- **Inventar markica** - Pregled dostupnih markica po tipovima
- **Dodjela markica** - Dodijelite markice članovima
- **Statistike potrošnje** - Koliko je markica potrošeno

### Članske kartice
- **Dodjela brojeva** - Dodijelite brojeve kartica novim članovima
- **Pregled kartica** - Lista svih dodijeljenih kartica
- **Zamjena kartica** - U slučaju gubitka ili oštećenja

---

## 📊 Izvještaji i statistike

### Statistike članova
- **Ukupno članova** - Po statusu i ulogama
- **Demografski podaci** - Raspodjela po dobi, spolu
- **Aktivnost članova** - Najaktivniji članovi

### Statistike aktivnosti
- **Broj aktivnosti** - Po tipovima i godinama
- **Sudjelovanje** - Najčešći sudionici
- **Odrađeni sati** - Ukupno sati po članovima

### Financijski izvještaji
- **Članarine** - Prihodi od članarina
- **Markice** - Potrošnja markica
- **Oprema** - Izdana oprema

---

## 🎽 Upravljanje opremom

### Inventar opreme
- **Pregled inventara** - Dostupna oprema po tipovima i veličinama
- **Majice** - Organizacijske majice po veličinama
- **Jakne** - Shell jakne po veličinama i spolovima  
- **Kape** - Kape po veličinama

### Distribucija opreme
- **Označavanje isporuke** - Označite kad je oprema isporučena članu
- **Pregled distribucije** - Tko je što primio
- **Gift oprema** - Besplatna oprema za posebne prilike

---

## 🔧 Alati i utilities

### Izvoz podataka
- **Lista članova** - Izvezite listu za printanje
- **Statistike** - Izvezite izvještaje u Excel format

---

## ❓ Česta pitanja

### Kako dodati novog člana?
1. Idite na **Upravljanje članovima** → **Dodaj člana**
2. Unesite osnovne podatke
3. Član će biti dodan s statusom "pending"
4. Dodijelite mu lozinku i karticu za aktivaciju

### Kako kreirati aktivnost?
1. **Aktivnosti** → **Kreiraj aktivnost**
2. Unesite sve potrebne podatke
3. Dodajte sudionike
4. Za izlete definirajte uloge sudionika

### Što ako član zaboravi lozinku?
1. Idite na **Upravljanje članovima**
2. Pronađite člana i kliknite **Uredi**
3. **Generiraj novu lozinku** - Sustav će generirati novu lozinku
4. Obavijestite člana o novoj lozinci

### Kako poslati poruku svim članovima?
1. **Poruke** → **Pošalji poruku**
2. Odaberite **Svi članovi**
3. Napišite poruku i pošaljite

---

## 🆘 Podrška

### Kontakt superusera
Za funkcionalnosti koje zahtijevaju superuser dozvole:
- Promjena sistemskih postavki organizacije
- Dodjela administratorskih uloga
- Brisanje aktivnosti i članova
- Upravljanje inventarom opreme

### Tehnička podrška
Za probleme s aplikacijom kontaktirajte tehničku podršku.

---
*Zadnje ažuriranje: 25. listopad 2025.*
