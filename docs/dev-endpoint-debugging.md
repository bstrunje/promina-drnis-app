# Debugging i Rješavanje Problema s Development Endpointom

Ovaj dokument opisuje proces dijagnostike i rješavanja problema s development-only API endpointom `/api/dev/reset-member-id-sequence`, koji je ključan za resetiranje sekvence ID-jeva članova u bazi podataka tijekom razvoja.

## Problem

Prilikom registracije novih članova u razvojnom okruženju, javljala se greška:

```json
{
    "message": "\nInvalid `prisma.member.create()` invocation:\n\n\nUnique constraint failed on the fields: (`member_id`)"
}
```

Napomena: Ovo je sirova ORM greška prikazana tijekom dijagnostike. Standardni API odgovori s greškom u aplikaciji aditivno uključuju i stabilno polje `code` (vidi `docs/api-docs.md`).

Ova greška ukazuje na to da je baza podataka pokušavala dodijeliti `member_id` koji već postoji, što znači da se sekvenca (auto-increment) za tablicu `members` nije ispravno resetirala nakon brisanja testnih podataka.

## Proces Dijagnostike

1.  **Endpoint nedostupan:** Prvi pokušaj pozivanja endpointa `/api/dev/reset-member-id-sequence` rezultirao je s `404 Not Found` ili `Cannot GET/POST`.
2.  **Provjera registracije ruta:** U `backend/src/app.ts` je utvrđeno da se dev rute registriraju samo ako je `process.env.NODE_ENV === 'development'`.
3.  **Postavljanje `NODE_ENV`:** U `docker-compose.yml` je dodana environment varijabla `NODE_ENV: development` za `backend` servis. Međutim, problem je i dalje postojao.
4.  **Docker Cache:** Sumnjalo se na Docker cache. Korištene su naredbe `docker-compose build --no-cache` i `docker-compose up --force-recreate` kako bi se osigurala svježa izgradnja slike. Problem je perzistirao.
5.  **Ispravak `dev.routes.ts`:** Uočeno je da je ruta bila pogrešno definirana kao `GET`, a pozivala se s `POST`. Također su postojali dupli exporti. Datoteka je ispravljena da koristi `POST` i ima ispravnu strukturu.
6.  **Skriveni znakovi u `NODE_ENV`:** Postavljena je hipoteza da `NODE_ENV` varijabla sadrži skrivene znakove (npr. carriage return `\r`) zbog razlika između Windows i Linux okruženja. Uvjet u `app.ts` je promijenjen u `process.env.NODE_ENV.trim() === 'development'`. Ni ovo nije riješilo problem.
7.  **Dodavanje `console.log`:** U `app.ts` je dodan detaljan `console.log` kako bi se ispisala točna vrijednost, duljina i tip `NODE_ENV` varijable. Log se nije pojavljivao pri pokretanju.

## Otkrivanje Ključnog Uzroka

Analiza `backend/Dockerfile` datoteke otkrila je da se naredba za prevođenje TypeScript koda u JavaScript **nikada nije izvršavala**. Aplikacija je unutar Docker kontejnera cijelo vrijeme pokretala staru, neizmijenjenu verziju koda iz `dist` direktorija.

## Rješenje

U `backend/Dockerfile` je dodana naredba `RUN npm run build` nakon `COPY . .` koraka:

```dockerfile
# ... (prethodne naredbe)

# Kopiramo ostatak koda aplikacije
COPY . .

# Gradimo aplikaciju (prevodimo TypeScript u JavaScript)
RUN npm run build

# Izlažemo port na kojem aplikacija radi
EXPOSE 3001

# ... (CMD naredba)
```

Nakon ove izmjene i ponovne izgradnje slike (`docker-compose build --no-cache`), logovi su potvrdili da se `NODE_ENV` ispravno prepoznaje i da su dev rute registrirane.

## Konačna Potvrda

Problem je konačno riješen slanjem ispravnog **POST** zahtjeva (ne GET) na `http://localhost:3001/api/dev/reset-member-id-sequence` koristeći `Invoke-WebRequest` u PowerShellu, što je uspješno resetiralo sekvencu i omogućilo normalnu registraciju novih članova.
