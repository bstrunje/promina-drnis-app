# API dokumentacija

Ovaj dokument pruža detaljan opis svih API endpointa dostupnih u Promina Drniš aplikaciji.

## Osnove API-ja

### Bazična URL struktura
```
/api/{resurs}/{operacija}
```

### Format odgovora
Svi endpointi vraćaju JSON odgovore u sljedećem formatu:

**Uspješno**:
```json
{
  "data": { ... },  // Podaci koji se vraćaju
  "status": "success"
}
```

**Greška**:
```json
{
  "code": "STABLE_ERROR_CODE",  // Stabilni kod za frontend i18n mapiranje
  "message": "Opis greške",
  "status": "error"
}
```

### Autentifikacija
Većina endpointa zahtijeva JWT token koji se prosljeđuje u Authorization headeru:
```
Authorization: Bearer {jwt_token}
```

## Članovi (Members)

### Dohvaćanje svih članova
```
GET /api/members
```

**Parametri**:
- `page` (opcija): Broj stranice za paginaciju (default: 1)
- `limit` (opcija): Broj članova po stranici (default: 50)
- `search` (opcija): Tekst za pretraživanje imena članova
- `sortBy` (opcija): Polje za sortiranje (npr. "first_name", "last_name", "date_of_birth")
- `sortOrder` (opcija): Redoslijed sortiranja ("asc" ili "desc")

**Odgovor**:
```json
{
  "data": {
    "members": [
      {
        "member_id": 1,
        "first_name": "Ime",
        "last_name": "Prezime",
        "full_name": "Ime Prezime",
        "date_of_birth": "1990-01-01",
        "gender": "male",
        "email": "ime.prezime@example.com",
        "role": "member",
        "total_hours": 25,
        "activity_status": "active"
      },
      // ...
    ],
    "total": 120,
    "page": 1,
    "limit": 50,
    "totalPages": 3
  },
  "status": "success"
}
```

### Dohvaćanje pojedinog člana
```
GET /api/members/{id}
```

**Odgovor**:
```json
{
  "data": {
    "member_id": 1,
    "first_name": "Ime",
    "last_name": "Prezime",
    "full_name": "Ime Prezime",
    "date_of_birth": "1990-01-01",
    "gender": "male",
    "street_address": "Ulica bb",
    "city": "Drniš",
    "oib": "12345678901",
    "cell_phone": "09812345678",
    "email": "ime.prezime@example.com",
    "life_status": "employed/unemployed",
    "role": "member",
    "total_hours": 25,
    "activity_status": "active",
    "membership_type": "regular",
    "tshirt_size": "L",
    "shell_jacket_size": "L",
    "card_number": "123",
    "card_stamp_issued": true,
    "fee_payment_year": 2025,
    "next_year_stamp_issued": false,
    "membership_periods": [
      {
        "id": 1,
        "start_date": "2022-01-01",
        "end_date": null,
        "end_reason": null
      }
    ],
    "fee_payments": [
      {
        "id": 1,
        "payment_date": "2025-01-15",
        "amount": 50,
        "payment_year": 2025
      }
    ],
    "activity_participations": [
      {
        "id": 1,
        "activity_id": 3,
        "hours": 8,
        "date": "2025-03-15",
        "title": "Čišćenje prirode"
      }
    ]
  },
  "status": "success"
}
```

### Dodavanje novog člana
```
POST /api/members
```

**Tijelo zahtjeva**:
```json
{
  "first_name": "Novi",
  "last_name": "Član",
  "date_of_birth": "1995-05-15",
  "gender": "male",
  "street_address": "Adresa 123",
  "city": "Drniš",
  "oib": "12345678901",
  "cell_phone": "0981234567",
  "email": "novi.clan@example.com",
  "life_status": "employed/unemployed",
  "tshirt_size": "M",
  "shell_jacket_size": "M"
}
```

**Odgovor**:
```json
{
  "data": {
    "member_id": 123,
    "first_name": "Novi",
    "last_name": "Član",
    // ...ostala polja...
  },
  "status": "success"
}
```

### Ažuriranje člana
```
PUT /api/members/{id}
```

**Tijelo zahtjeva**:
```json
{
  "street_address": "Nova adresa 456",
  "cell_phone": "0989876543",
  "tshirt_size": "L"
}
```

**Odgovor**:
```json
{
  "data": {
    "member_id": 123,
    "first_name": "Novi",
    "last_name": "Član",
    "street_address": "Nova adresa 456",
    "cell_phone": "0989876543",
    "tshirt_size": "L",
    // ...ostala polja...
  },
  "status": "success"
}
```

### Brisanje člana
```
DELETE /api/members/{id}
```

**Odgovor**:
```json
{
  "data": {
    "message": "Član uspješno obrisan"
  },
  "status": "success"
}
```

## Članstvo (Membership)

### Dohvaćanje članarina za člana
```
GET /api/membership/fees/{memberId}
```

**Odgovor**:
```json
{
  "data": {
    "fees": [
      {
        "id": 1,
        "member_id": 123,
        "payment_date": "2024-01-15",
        "amount": 50,
        "payment_year": 2024,
        "notes": "Godišnja članarina"
      },
      {
        "id": 2,
        "member_id": 123,
        "payment_date": "2025-01-10",
        "amount": 50,
        "payment_year": 2025,
        "notes": null
      }
    ]
  },
  "status": "success"
}
```

### Dodavanje članarine
```
POST /api/membership/fees
```

**Tijelo zahtjeva**:
```json
{
  "member_id": 123,
  "payment_date": "2025-01-15",
  "amount": 50,
  "payment_year": 2025,
  "notes": "Godišnja članarina"
}
```

**Odgovor**:
```json
{
  "data": {
    "id": 3,
    "member_id": 123,
    "payment_date": "2025-01-15",
    "amount": 50,
    "payment_year": 2025,
    "notes": "Godišnja članarina"
  },
  "status": "success"
}
```

### Dohvaćanje razdoblja članstva za člana
```
GET /api/membership/periods/{memberId}
```

**Odgovor**:
```json
{
  "data": {
    "periods": [
      {
        "id": 1,
        "member_id": 123,
        "start_date": "2020-05-10",
        "end_date": "2022-12-31",
        "end_reason": "inactivity",
        "notes": "Završeno zbog neaktivnosti"
      },
      {
        "id": 2,
        "member_id": 123,
        "start_date": "2023-01-15",
        "end_date": null,
        "end_reason": null,
        "notes": "Novo aktivno razdoblje"
      }
    ]
  },
  "status": "success"
}
```

### Dodavanje razdoblja članstva
```
POST /api/membership/periods
```

**Tijelo zahtjeva**:
```json
{
  "member_id": 123,
  "start_date": "2023-01-15",
  "end_date": null,
  "end_reason": null,
  "notes": "Novo aktivno razdoblje"
}
```

**Odgovor**:
```json
{
  "data": {
    "id": 2,
    "member_id": 123,
    "start_date": "2023-01-15",
    "end_date": null,
    "end_reason": null,
    "notes": "Novo aktivno razdoblje"
  },
  "status": "success"
}
```

### Ažuriranje razdoblja članstva
```
PUT /api/membership/periods/{periodId}
```

**Tijelo zahtjeva**:
```json
{
  "end_date": "2023-12-31",
  "end_reason": "withdrawal",
  "notes": "Član istupio iz društva"
}
```

**Odgovor**:
```json
{
  "data": {
    "id": 2,
    "member_id": 123,
    "start_date": "2023-01-15",
    "end_date": "2023-12-31",
    "end_reason": "withdrawal",
    "notes": "Član istupio iz društva"
  },
  "status": "success"
}
```

## Aktivnosti (Activities)

### Dohvaćanje svih aktivnosti
```
GET /api/activities
```

**Parametri**:
- `page` (opcija): Broj stranice za paginaciju (default: 1)
- `limit` (opcija): Broj aktivnosti po stranici (default: 20)
- `year` (opcija): Filtriranje po godini
- `sortBy` (opcija): Polje za sortiranje (npr. "date", "title")
- `sortOrder` (opcija): Redoslijed sortiranja ("asc" ili "desc")

**Odgovor**:
```json
{
  "data": {
    "activities": [
      {
        "id": 1,
        "title": "Čišćenje prirode",
        "description": "Godišnja akcija čišćenja okoliša",
        "date": "2025-03-15",
        "location": "Promina",
        "hours": 6,
        "participant_count": 15,
        "total_hours": 90
      },
      // ...
    ],
    "total": 35,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  },
  "status": "success"
}
```

### Dohvaćanje pojedine aktivnosti
```
GET /api/activities/{id}
```

**Odgovor**:
```json
{
  "data": {
    "id": 1,
    "title": "Čišćenje prirode",
    "description": "Godišnja akcija čišćenja okoliša na području Promine",
    "date": "2025-03-15",
    "location": "Promina",
    "hours": 6,
    "notes": "Ponijeti rukavice i adekvatnu obuću",
    "participants": [
      {
        "id": 1,
        "member_id": 123,
        "hours": 6,
        "notes": null,
        "member": {
          "first_name": "Ime",
          "last_name": "Prezime",
          "full_name": "Ime Prezime"
        }
      },
      // ...
    ]
  },
  "status": "success"
}
```

### Kreiranje nove aktivnosti
```
POST /api/activities
```

**Tijelo zahtjeva**:
```json
{
  "title": "Nova aktivnost",
  "description": "Opis nove aktivnosti",
  "date": "2025-05-20",
  "location": "Drniš",
  "hours": 4,
  "notes": "Dodatne napomene"
}
```

**Odgovor**:
```json
{
  "data": {
    "id": 10,
    "title": "Nova aktivnost",
    "description": "Opis nove aktivnosti",
    "date": "2025-05-20",
    "location": "Drniš",
    "hours": 4,
    "notes": "Dodatne napomene",
    "participants": []
  },
  "status": "success"
}
```

### Ažuriranje aktivnosti
```
PUT /api/activities/{id}
```

**Tijelo zahtjeva**:
```json
{
  "title": "Ažurirana aktivnost",
  "hours": 5
}
```

**Odgovor**:
```json
{
  "data": {
    "id": 10,
    "title": "Ažurirana aktivnost",
    "description": "Opis nove aktivnosti",
    "date": "2025-05-20",
    "location": "Drniš",
    "hours": 5,
    "notes": "Dodatne napomene"
  },
  "status": "success"
}
```

### Brisanje aktivnosti
```
DELETE /api/activities/{id}
```

**Odgovor**:
```json
{
  "data": {
    "message": "Aktivnost uspješno obrisana"
  },
  "status": "success"
}
```

### Dodavanje sudionika na aktivnost
```
POST /api/activities/{id}/participants
```

**Tijelo zahtjeva**:
```json
{
  "member_id": 123,
  "hours": 4,
  "notes": "Sudjelovao u prvoj grupi"
}
```

**Odgovor**:
```json
{
  "data": {
    "id": 5,
    "activity_id": 10,
    "member_id": 123,
    "hours": 4,
    "notes": "Sudjelovao u prvoj grupi",
    "member": {
      "first_name": "Ime",
      "last_name": "Prezime",
      "full_name": "Ime Prezime"
    }
  },
  "status": "success"
}
```

### Uklanjanje sudionika s aktivnosti
```
DELETE /api/activities/{activityId}/participants/{participantId}
```

**Odgovor**:
```json
{
  "data": {
    "message": "Sudionik uspješno uklonjen"
  },
  "status": "success"
}
```

## Autentifikacija (Auth)

### Prijava
```
POST /api/auth/login
```

**Tijelo zahtjeva**:
```json
{
  "username": "Ime Prezime",
  "password": "lozinka123"
}
```

**Odgovor**:
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "member_id": 123,
      "first_name": "Ime",
      "last_name": "Prezime",
      "full_name": "Ime Prezime",
      "role": "admin",
      // ...ostali podaci korisnika...
    }
  },
  "status": "success"
}
```

### Dohvaćanje trenutnog korisnika
```
GET /api/auth/me
```

**Odgovor**:
```json
{
  "data": {
    "member_id": 123,
    "first_name": "Ime",
    "last_name": "Prezime",
    "full_name": "Ime Prezime",
    "role": "admin",
    // ...ostali podaci korisnika...
  },
  "status": "success"
}
```

### Promjena lozinke
```
POST /api/auth/change-password
```

**Tijelo zahtjeva**:
```json
{
  "current_password": "trenutna_lozinka",
  "new_password": "nova_lozinka",
  "confirm_password": "nova_lozinka"
}
```

**Odgovor**:
```json
{
  "data": {
    "message": "Lozinka uspješno promijenjena"
  },
  "status": "success"
}
```

## Izvještaji (Reports)

### Godišnji izvještaj aktivnosti
```
GET /api/reports/activities/year/{year}
```

**Odgovor**:
```json
{
  "data": {
    "year": 2025,
    "total_activities": 15,
    "total_hours": 450,
    "total_participants": 120,
    "activities_by_month": [
      {
        "month": 1,
        "count": 1,
        "hours": 30
      },
      // ...za svaki mjesec...
    ],
    "most_active_members": [
      {
        "member_id": 123,
        "full_name": "Ime Prezime",
        "total_hours": 45,
        "activity_count": 8
      },
      // ...
    ]
  },
  "status": "success"
}
```

### Članarine po godini
```
GET /api/reports/fees/year/{year}
```

**Odgovor**:
```json
{
  "data": {
    "year": 2025,
    "total_members": 150,
    "paid_members": 120,
    "unpaid_members": 30,
    "total_amount": 6000,
    "payments_by_month": [
      {
        "month": 1,
        "count": 80,
        "amount": 4000
      },
      // ...za svaki mjesec...
    ]
  },
  "status": "success"
}
```

### Statistika članova
```
GET /api/reports/members/stats
```

**Odgovor**:
```json
{
  "data": {
    "total_members": 150,
    "active_members": 120,
    "inactive_members": 30,
    "by_gender": {
      "male": 90,
      "female": 60
    },
    "by_age_group": [
      {
        "group": "18-30",
        "count": 40
      },
      {
        "group": "31-45",
        "count": 50
      },
      {
        "group": "46-60",
        "count": 40
      },
      {
        "group": "61+",
        "count": 20
      }
    ],
    "by_city": [
      {
        "city": "Drniš",
        "count": 80
      },
      {
        "city": "Šibenik",
        "count": 30
      },
      // ...
    ]
  },
  "status": "success"
}
```

## Testiranje API-ja

Za testiranje API-ja možete koristiti alate poput:
- [Postman](https://www.postman.com/)
- [Insomnia](https://insomnia.rest/)
- [curl](https://curl.se/)

### Primjer curl zahtjeva

Dohvaćanje svih članova:
```bash
curl -X GET \
  http://localhost:3000/api/members \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json'
```

Dodavanje novog člana:
```bash
curl -X POST \
  http://localhost:3000/api/members \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json' \
  -d '{
    "first_name": "Novi",
    "last_name": "Član",
    "date_of_birth": "1995-05-15",
    "gender": "male",
    "street_address": "Adresa 123",
    "city": "Drniš",
    "oib": "12345678901",
    "cell_phone": "0981234567",
    "email": "novi.clan@example.com"
  }'
```

## Rukovanje greškama

API koristi standardne HTTP statusne kodove za indikaciju uspjeha ili neuspjeha zahtjeva:

- **200 OK**: Zahtjev uspješno izvršen
- **201 Created**: Resurs uspješno kreiran
- **400 Bad Request**: Nevažeći zahtjev (npr. nedostaju obavezna polja)
- **401 Unauthorized**: Autentifikacija nije uspjela
- **403 Forbidden**: Klijent nema potrebne dozvole
- **404 Not Found**: Traženi resurs nije pronađen
- **422 Unprocessable Entity**: Semantička greška u zahtjevu
- **500 Internal Server Error**: Neočekivana greška na serveru

### Primjeri grešaka

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Nedostaju obavezna polja: first_name, last_name",
  "status": "error"
}
```

```json
{
  "code": "AUTH_ERROR",
  "message": "Neispravno korisničko ime ili lozinka",
  "status": "error"
}
```

```json
{
  "code": "RESOURCE_NOT_FOUND",
  "message": "Član s ID-om 999 nije pronađen",
  "status": "error"
}
```

### Stabilni kodovi grešaka

Sljedeći stabilni kodovi dodani su u backend kako bi frontend mogao dosljedno mapirati poruke grešaka na i18n prijevode. Poruke (message) ostaju zbog kompatibilnosti i koriste se kao fallback.

- Autentikacija (`backend/src/controllers/auth/login.handler.ts`)
  - AUTH_MISSING_CREDENTIALS
  - AUTH_INVALID_CREDENTIALS
  - AUTH_MEMBERSHIP_INVALID
  - AUTH_ACCOUNT_NOT_ACTIVE
  - AUTH_ACCOUNT_LOCKED
  - AUTH_SERVER_ERROR

 - Autentikacija – Refresh token (`backend/src/controllers/auth/refreshToken.handler.ts`)
   - AUTH_REFRESH_TOKEN_INVALID
   - AUTH_REFRESH_TOKEN_EXPIRED
   - AUTH_USER_NOT_FOUND
   - AUTH_SERVER_ERROR

 - Autentikacija – Odjava (`backend/src/controllers/auth/logout.handler.ts`)
   - AUTH_LOGOUT_FAILED

 - Autentikacija – Registracija (`backend/src/controllers/auth/auth.handlers.registration.ts`)
   - AUTH_REGISTRATION_DUP_EMAIL
   - AUTH_REGISTRATION_DUP_OIB
   - AUTH_REGISTRATION_FAILED

 - Autentikacija – Članski pomoćni handleri (`backend/src/controllers/auth/auth.handlers.member.ts`)
   - VALIDATION_ERROR
   - MEMBER_NOT_FOUND
   - MEMBER_ONLY_PENDING
   - CARDNUM_LENGTH_INVALID
   - CARDNUM_ASSIGN_FAILED
   - AUTH_PASSWORD_ASSIGN_FAILED
   - SERVER_ERROR

- Brojevi iskaznica (`backend/src/controllers/cardnumber.controller.ts`)
  - CARDNUM_FETCH_AVAILABLE_FAILED
  - CARDNUM_INVALID_INPUT, CARDNUM_LENGTH_INVALID
  - CARDNUM_ADD_FAILED
  - CARDNUM_RANGE_INVALID_INPUT, CARDNUM_RANGE_INVALID_ORDER, CARDNUM_RANGE_TOO_LARGE, CARDNUM_RANGE_ADD_FAILED
  - CARDNUM_MISSING_PARAM, CARDNUM_NOT_FOUND_OR_ASSIGNED, CARDNUM_DELETE_FAILED
  - CARDNUM_FETCH_ALL_FAILED
  - CARDNUM_FORBIDDEN_SYNC, CARDNUM_SYNC_FAILED
  - CARDNUM_FORBIDDEN_CONSUMED, CARDNUM_FETCH_CONSUMED_FAILED
  - CARDNUM_FORMAT_INVALID, CARDNUM_MEMBER_NOT_FOUND, CARDNUM_ALREADY_ASSIGNED, CARDNUM_ONLY_PENDING

- Poruke članova (`backend/src/controllers/member.message.controller.ts`)
  - AUTH_UNAUTHORIZED
  - MSG_CREATE_FAILED, MSG_SEND_FAILED, MSG_NO_RECIPIENTS, MSG_SEND_GROUP_FAILED, MSG_SEND_ALL_FAILED
  - MSG_FETCH_SENT_FAILED, MSG_FETCH_FAILED
  - MSG_MARK_READ_FAILED, MSG_ARCHIVE_FAILED
  - MSG_NOT_FOUND, MSG_DELETE_FAILED, MSG_DELETE_ALL_FAILED
  - MSG_MARK_READ_FORBIDDEN
  - MSG_UNREAD_COUNT_FAILED

- Članstvo (`backend/src/controllers/membership.controller.ts`)
  - AUTH_UNAUTHORIZED (na Unauthorized granama; ostale greške idu kroz handleControllerError)

- Dozvole (`backend/src/controllers/permissions.controller.ts`)
  - PERM_FORBIDDEN, PERM_FETCH_FAILED, AUTH_UNAUTHORIZED, PERM_UPDATE_FAILED

- Postavke (`backend/src/controllers/settings.controller.ts`)
  - SETTINGS_FETCH_FAILED, SETTINGS_VALIDATION_ERROR, AUTH_UNAUTHORIZED, SETTINGS_FORBIDDEN_UPDATE, SETTINGS_UPDATE_FAILED

## Razvojne i produkcijske okoline

API je dostupan na sljedećim URL-ovima:

- **Razvoj**: http://localhost:3000/api
- **Produkcija**: https://promina-drnis-app.com/api (primjer)

## Dodatne napomene

- Svi datumi se šalju i primaju u formatu ISO 8601 (YYYY-MM-DD)
- Polja koja prihvaćaju enumeracije (npr. gender, role) imaju ograničen skup vrijednosti
- Za postizanje boljih performansi, koristite filtriranje i paginaciju
- Za testiranje vremenski ovisnih funkcionalnosti, koristite x-test-mode i x-test-date headere

### Lokalizacija odgovora (backend)

- Backend detektira jezik iz HTTP zaglavlja u ovom redoslijedu:
  - `X-Lang` ili `X-Language` (npr. `hr`, `en`)
  - `Accept-Language` (uzima se prvi jezik, bez regionalnog sufiksa)
  - default: `en`
- Svi korisnički vidljivi tekstovi (poruke o uspjehu i greškama) mogu biti lokalizirani. API oblik odgovora ostaje nepromijenjen (npr. polja `code`, `message`, `error`).
- Frontend treba mapirati stabilne kodove grešaka (polje `code`) na vlastite i18n prijevode ili koristiti vraćenu lokaliziranu poruku iz polja `message`/`error` kao fallback.
