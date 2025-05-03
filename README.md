# Promina Drniš App

Aplikacija za upravljanje članstvom, aktivnostima i administrativnim zadacima za Društvo Promina Drniš.

## Opis projekta

Ova aplikacija omogućuje praćenje članstva, evidenciju uplata članarina, vođenje evidencije aktivnosti članova, izdavanje iskaznica i upravljanje ostalim administrativnim aspektima društva. Dizajnirana je za interno korištenje s maksimalno 200 korisnika u lokalnom okruženju.

## Funkcionalnosti

### Upravljanje članstvom
- Evidencija članova s osobnim podacima (ime, prezime, nadimak, OIB, kontakt)
- Praćenje statusa članstva (aktivan, neaktivan, na čekanju)
- Generiranje i izdavanje članskih iskaznica
- Produživanje članstva i evidencija uplate članarine

### Administracija
- Upravljanje korisničkim ulogama (član, admin, superuser)
- Slanje poruka članovima (individualno ili grupno)
- Vođenje evidencije aktivnosti članova
- Generiranje izvještaja

### Korisnički dio
- Pregled osobnog profila s podacima
- Pregled primljenih poruka
- Ažuriranje osobnih podataka

## Tehnologije

### Frontend
- React.js s TypeScript
- Vite kao build alat
- Radix UI komponente
- Zustand za state management
- Axios za HTTP zahtjeve

### Backend
- Node.js s Express
- TypeScript
- Prisma ORM
- JWT autentifikacija
- API struktura s kontrolerima i repozitorijima

### Shared
- Dijeljeni tipovi između frontenda i backenda
- Centralizirana validacija

## Struktura projekta

```
promina-drnis-app/
├── backend/               # Backend aplikacija (Node.js/Express)
│   ├── src/               
│   │   ├── controllers/   # API kontroleri
│   │   ├── middleware/    # Express middleware
│   │   ├── models/        # Prisma modeli
│   │   ├── repositories/  # Repository sloj za pristup bazi
│   │   ├── routes/        # API rute
│   │   ├── services/      # Poslovna logika
│   │   ├── shared/        
│   │   │   └── types/     # Sinkronizirani tipovi s frontenda
│   │   └── app.ts         # Glavna aplikacija
│   ├── prisma/            # Prisma konfiguracija i migracije
│   └── package.json
│
├── frontend/              # Frontend aplikacija (React/Vite)
│   ├── components/        # Dijeljene komponente
│   ├── public/            # Statički resursi
│   ├── shared/            
│   │   └── types/         # Izvorne definicije tipova (source of truth)
│   ├── src/
│   │   ├── assets/        # Slike, fontovi, itd.
│   │   ├── context/       # React konteksti
│   │   ├── features/      # Organizirano po funkcionalnostima
│   │   ├── hooks/         # Prilagođeni React hookovi
│   │   ├── lib/           # Utility funkcije
│   │   └── utils/         # Pomoćne funkcije
│   └── package.json
│
└── package.json           # Root package.json za workspaces
```

## Pokretanje aplikacije

### Preduvjeti
- Node.js v18 ili noviji
- npm 8 ili noviji
- PostgreSQL (za produkciju) ili SQLite (za razvoj)

### Razvoj

1. Klonirajte repozitorij:
   ```
   git clone https://github.com/korisnik/promina-drnis-app.git
   cd promina-drnis-app
   ```

2. Instalirajte dependencies:
   ```
   npm install
   ```

3. Stvorite .env datoteku u backend direktoriju:
   ```
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="vaš-tajni-ključ"
   PORT=3000
   ```

4. Pokrenite migracije za bazu podataka:
   ```
   cd backend
   npx prisma migrate dev
   ```

5. Pokrenite backend (iz glavnog direktorija):
   ```
   npm run start:backend
   ```

6. U drugom terminalu, pokrenite frontend (iz glavnog direktorija):
   ```
   npm run dev:frontend
   ```

### Produkcija

1. Izradite produkcijsku verziju:
   ```
   npm run build
   ```

2. Pokrenite produkcijsku verziju backenda:
   ```
   cd backend
   npm start
   ```

3. Poslužite frontend s preferiranim web serverom (nginx, Apache, itd.)

## Ključne funkcionalnosti

- Upravljanje članovima (dodavanje, uređivanje, brisanje)
- Praćenje članarina i uplata
- Izdavanje i praćenje članskih iskaznica
- Evidencija aktivnosti članova
- Upravljanje ulogama i pravima pristupa
- Izvještaji i statistike
- Simulacija datuma za testiranje vremenom-vezanih funkcionalnosti

## Dokumentacija

Detaljnija dokumentacija dostupna je u direktoriju `docs/`:

- [Struktura i tipovi podataka](./docs/data-models.md)
- [Proces sinkronizacije tipova](./docs/type-sync-process.md)
- [Autentifikacija i autorizacija](./docs/auth-system.md)
- [Testiranje i Mock datum](./docs/testing.md)
- [API dokumentacija](./docs/api-docs.md)

## Kontakt

Za pitanja ili podršku kontaktirajte administratora projekta.