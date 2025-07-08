# Dokumentacija: Sustav za godišnju statistiku (Annual Statistics)

## 1. Svrha

Ovaj dokument opisuje arhitekturu i implementaciju sustava za praćenje godišnje statistike aktivnosti i odrađenih sati za svakog člana. Cilj je osigurati točne, ažurne i efikasno dohvatljive podatke o doprinosu članova po godinama.

## 2. Arhitektura

Sustav se temelji na `AnnualStatistics` modelu u Prisma shemi i principu **ažuriranja "u hodu"** (on-the-fly updates).

### 2.1. Model podataka (`AnnualStatistics`)

-   **`stat_id`**: Jedinstveni identifikator zapisa.
-   **`member_id`**: Poveznica na člana ([Member](cci:2://file:///c:/sinkronizacija/promina-drnis-app/backend/src/repositories/member.repository.ts:48:0-53:1)).
-   **`year`**: Godina na koju se statistika odnosi.
-   **`total_hours`**: Ukupan broj priznatih sati za člana u toj godini.
-   **`total_activities`**: Ukupan broj završenih aktivnosti na kojima je član sudjelovao u toj godini.
-   **`membership_status`**: Status članstva u toj godini (za buduću upotrebu).
-   **`calculated_at`**: Vremenska oznaka zadnjeg ažuriranja zapisa.

### 2.2. Princip rada

Logika za ažuriranje statistike se pokreće automatski nakon svake relevantne akcije u sustavu koja može utjecati na sate ili broj aktivnosti člana. Ovo uključuje:
-   Završetak aktivnosti.
-   Ažuriranje vremena ili statusa postojeće aktivnosti.
-   Dodavanje/uklanjanje sudionika s aktivnosti.
-   Ručni unos ili izmjena sati za sudionika.
-   Otkazivanje ili brisanje aktivnosti.

Centralna funkcija `statisticsService.updateAnnualStatistics(memberId, year)` je odgovorna za ponovni izračun i spremanje statistike za određenog člana i godinu.

## 3. Logika izračuna sati

Izračun sati slijedi precizna pravila kako bi se osigurala točnost:

1.  **Izvor podataka**: Uzimaju se u obzir samo aktivnosti sa statusom `COMPLETED`.
2.  **Prioritet ručnog unosa**: Ako za sudjelovanje postoji vrijednost u `manual_hours`, ona se koristi kao primarni izvor sati.
3.  **Automatski izračun**: Ako `manual_hours` nije definiran, sati se izračunavaju kao razlika između `actual_end_time` i `actual_start_time` aktivnosti.
4.  **Priznavanje sati**: Na izračunatu vrijednost (bilo iz ručnog unosa ili automatski) primjenjuje se postotak priznavanja (`recognition_override` iz `ActivityParticipation` modela).

## 4. Implementacija

Ključna logika bit će smještena u novom servisnom modulu: `backend/src/services/statistics.service.ts`.

Ovaj servis će sadržavati funkciju `updateAnnualStatistics` koja će biti pozvana iz [activities.service.ts](cci:7://file:///c:/sinkronizacija/promina-drnis-app/backend/src/services/activities.service.ts:0:0-0:0) na svim mjestima gdje se događaju promjene relevantne za statistiku.

## 5. Tehnička dokumentacija za funkcionalnost godišnje statistike

### 5.1. Svrha

Cilj ove funkcionalnosti je omogućiti brz i efikasan dohvat agregiranih podataka o ukupnom broju aktivnosti i ukupnom broju odrađenih sati za svakog člana, grupirano po kalendarskim godinama.

### 5.2. Arhitektura i mehanizam

Odabran je pristup ažuriranja statistike **"u hodu" (on-the-fly)**. To znači da se statistika u tablici `annual_statistics` ažurira odmah nakon svake operacije u sustavu koja može utjecati na ukupan broj sati ili aktivnosti člana.

### 5.3. Ključne komponente

-   **Prisma Model**: `AnnualStatistics`
-   **Servis**: `backend/src/services/statistics.service.ts`
-   **Integracija**: `backend/src/services/activities.service.ts`

### 5.4. Funkcija: `updateAnnualStatistics(memberId, year, tx?)`

Ova funkcija je srce sustava. Ona radi sljedeće:

1.  **Dohvaća sva sudjelovanja (`ActivityParticipation`)** za zadanog člana (`memberId`) u zadanoj godini (`year`).
2.  **Izračunava ukupan broj sati** na temelju `manual_hours` ili razlike između `actual_start_time` i `actual_end_time`, uzimajući u obzir `recognition_percentage` i `recognition_override`.
3.  **Broji ukupan broj jedinstvenih aktivnosti** na kojima je član sudjelovao u toj godini.
4.  **Koristi `prisma.annualStatistics.upsert()`** kako bi atomično kreirala novi zapis (ako ne postoji) ili ažurirala postojeći zapis za kombinaciju `member_id` i `year`.

### 5.5. Integracija u `activities.service.ts`

Pozivi na `updateAnnualStatistics` su integrirani na svim mjestima gdje se mijenjaju podaci o aktivnostima ili sudjelovanju članova:

-   **`createActivity`**: Nakon kreiranja nove aktivnosti, poziva se za sve dodane sudionike.
-   **`updateActivity`**: Nakon izmjene aktivnosti (npr. promjena datuma ili sudionika), poziva se za sve pogođene članove (i stare i nove).
-   **`cancelActivity` / `deleteActivity`**: Nakon otkazivanja ili brisanja aktivnosti, poziva se za sve sudionike kako bi se statistika ponovno izračunala.
-   **`addParticipant`**: Nakon dodavanja člana na aktivnost.
-   **`removeParticipant`**: Nakon uklanjanja člana s aktivnosti.
-   **`updateParticipation`**: Nakon ručne izmjene sati ili vremena sudjelovanja za pojedinog člana.

## 6. Korisnički tijek

Korisnički tijek je dizajniran da bude intuitivan i postupan:

1.  **Dashboard**: Član na svojoj nadzornoj ploči (`MemberDashboard`) ima karticu "Sve moje aktivnosti".
2.  **Pregled po godinama**: Klikom na karticu, korisnik dolazi na stranicu `ActivityOverviewPage` (`/members/:memberId/activities-overview`). Ova stranica prikazuje popis godina u kojima je član imao aktivnosti, zajedno s ukupnim brojem aktivnosti i sati za svaku godinu.
3.  **Pregled po aktivnostima**: Klikom na pojedinu godinu, korisnik se preusmjerava na `ActivityYearPage` (`/members/:memberId/activities/:year`), gdje vidi detaljan popis svih aktivnosti u kojima je sudjelovao te godine.
4.  **Detalji aktivnosti**: Klikom na pojedinu aktivnost, dolazi na standardnu stranicu s detaljima te aktivnosti.

## 7. Backend - API Endpoints

Sustav se oslanja na nekoliko ključnih API ruta.

### 1. Dohvaćanje godišnje statistike

-   **Ruta**: `GET /api/members/:memberId/annual-stats`
-   **Opis**: Vraća polje objekata, gdje svaki objekt predstavlja jednu godinu i sadrži ukupni broj sati i aktivnosti za tu godinu.
-   **Koristi se**: Na stranici `ActivityOverviewPage` za prikaz kartica s godinama.
-   **Primjer odgovora**:
    ```json
    [
      {
        "year": 2024,
        "total_hours": 120.5,
        "total_activities": 15
      },
      {
        "year": 2023,
        "total_hours": 85,
        "total_activities": 10
      }
    ]
    ```

### 2. Dohvaćanje aktivnosti po godini

-   **Ruta**: `GET /api/activities/member/:memberId/:year`
-   **Opis**: Vraća sva sudjelovanja (participations) određenog člana za specifičnu godinu. Svako sudjelovanje uključuje i detalje o samoj aktivnosti.
-   **Koristi se**: Na stranici `ActivityYearPage` za prikaz popisa aktivnosti.
-   **Primjer odgovora**:
    ```json
    [
      {
        "participation_id": 1,
        "member_id": 3,
        "activity_id": 101,
        "start_time": null,
        "end_time": null,
        "manual_hours": 8,
        "activity": {
          "activity_id": 101,
          "title": "Izlet na Dinaru",
          "start_date": "2024-05-10T00:00:00.000Z",
          // ... ostali podaci o aktivnosti
        }
      }
    ]
    ```

## 8. Frontend - Ključne komponente

-   `ActivityOverviewPage.tsx`: Komponenta koja koristi `annual-stats` endpoint za prikaz godina.
-   `ActivityYearPage.tsx`: Komponenta koja koristi `/member/:memberId/:year` endpoint za prikaz aktivnosti unutar odabrane godine.
-   `BackToDashboard.tsx`: Pametna komponenta za povratak na nadzornu ploču koja prepoznaje ulogu korisnika.

---
*Ovaj dokument treba redovito ažurirati kako bi odražavao sve promjene u implementaciji.*