# Dokumentacija Modula Aktivnosti

## Pregled

Modul Aktivnosti u Promina Drniš aplikaciji predstavlja središnji sustav za upravljanje događajima, izletima, sastancima i drugim aktivnostima planinarskog društva. Ovaj modul omogućuje organizaciju različitih tipova aktivnosti, praćenje sudjelovanja članova i izračun volonterskih sati.

## Vrste aktivnosti

Sustav podržava različite tipove aktivnosti koji su definirani u bazi podataka:
- **Izleti** - planinarski izleti s posebnim ulogama sudionika
- **Sastanci** - formalni sastanci društva
- **Akcije** - radne akcije i volonterski rad
- **Edukacije** - tečajevi i edukativni programi
- **Dežurstva** - dežurstva članova u društvenom prostoru

Svaka vrsta aktivnosti može imati specifičnu logiku za izračun volonterskih sati i priznavanje doprinosa članova.

## Arhitektura

### Frontend komponente

- **`CreateActivityModal.tsx`** - Modalni prozor za kreiranje i uređivanje aktivnosti
- **`ActivityDetailPage.tsx`** - Stranica koja prikazuje detalje pojedinačne aktivnosti
- **`MemberSelect.tsx`** - Komponenta za odabir članova za standardne aktivnosti
- **`MemberRoleSelect.tsx`** - Specijalizirana komponenta za odabir članova s ulogama za izlete

### Backend servisi

- **`activities.service.ts`** - Servisni sloj koji sadrži poslovnu logiku za aktivnosti
- **`activities.controller.ts`** - Kontroler koji obrađuje HTTP zahtjeve za API
- **`activities.repository.ts`** - Repozitorij za direktnu komunikaciju s bazom podataka

### API Endpointi

- `GET /api/activities` - Dohvaćanje svih aktivnosti
- `GET /api/activities/:id` - Dohvaćanje detalja pojedinačne aktivnosti
- `POST /api/activities` - Stvaranje nove aktivnosti
- `PUT /api/activities/:id` - Ažuriranje postojeće aktivnosti
- `DELETE /api/activities/:id` - Brisanje aktivnosti

## Specijalizirane uloge za izlete

Aplikacija implementira sustav uloga za sudionike izleta s različitim postotcima priznavanja volonterskih sati:

### Uloge i postoci priznavanja

| Uloga | Naziv | Postotak priznavanja |
|-------|-------|---------------------|
| GUIDE | Vodič | 100% |
| ASSISTANT_GUIDE | Pomoćni vodič | 50% |
| DRIVER | Vozač | 100% |
| REGULAR | Izletnik | 10% |

### Implementacija uloga

Uloge su definirane u `MemberRoleSelect.tsx`:

```typescript
export enum ParticipantRole {
  GUIDE = 'GUIDE',
  ASSISTANT_GUIDE = 'ASSISTANT_GUIDE',
  DRIVER = 'DRIVER',
  REGULAR = 'REGULAR'
}

export const rolesToRecognitionPercentage: Record<ParticipantRole, number> = {
  [ParticipantRole.GUIDE]: 100,
  [ParticipantRole.ASSISTANT_GUIDE]: 50,
  [ParticipantRole.DRIVER]: 100,
  [ParticipantRole.REGULAR]: 10,
};
```

### Tijek rada s ulogama

1. Korisnik odabire tip aktivnosti "IZLETI" u modalnom prozoru za stvaranje aktivnosti
2. Umjesto standardne komponente za odabir članova, prikazuje se `MemberRoleSelect` komponenta
3. Korisnik odabire članove i za svakog člana određuje ulogu (vodič, pomoćni vodič, vozač, izletnik)
4. Pri spremanju aktivnosti, sustav automatski primjenjuje odgovarajući postotak priznavanja za svakog sudionika prema ulozi
5. Ovi postoci priznavanja koriste se za izračun volonterskih sati

### Prednosti ovog pristupa

- Centralizirana definicija uloga i postotaka priznavanja
- Jednostavna izmjena postotaka na jednom mjestu (`rolesToRecognitionPercentage` konstanta)
- Automatsko mapiranje između uloga i postotaka
- Prikaz odgovarajućih naziva uloga na korisničkom sučelju

## Ažuriranje podataka

Frontend priprema podatke za slanje na backend u sljedećem formatu:
- Za standardne aktivnosti: koristi se polje `participant_ids` s ID-ovima članova
- Za izlete: koristi se polje `participations` koje sadrži objekte s ID-om člana i postotkom priznavanja određenim prema ulozi

Backend procesira ove podatke u `activities.service.ts` i stvara odgovarajuće zapise o sudjelovanju u bazi podataka.

## Prikaz aktivnosti

Na stranici s detaljima aktivnosti (`ActivityDetailPage.tsx`), za izlete se prikazuju uloge sudionika i njihovi postoci priznavanja. Sustav mapira postotke nazad u uloge koristeći istu `rolesToRecognitionPercentage` konstantu.

## Buduća unapređenja

Moguća buduća unapređenja modula aktivnosti uključuju:
- Direktno pohranjivanje uloga u bazu podataka umjesto samo postotaka priznavanja
- Dodatne uloge sa specifičnim postocima priznavanja
- Prilagodljivi postoci priznavanja koji se mogu konfigurirati putem sučelja
- Izvještaji o sudjelovanju prema ulogama i kategorijama aktivnosti
- Grafički prikaz aktivnosti i sudionika

## Zaključak

Implementacija specijaliziranih uloga za izlete omogućuje preciznije praćenje doprinosa članova u različitim ulogama na izletima. Sustav je dizajniran da bude fleksibilan, održiv i jednostavan za korištenje, uz minimalne promjene u postojećoj strukturi baze podataka.
