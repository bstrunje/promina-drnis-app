# Data Sanitization

## Overview

Automatska sanitizacija podataka implementirana je kako bi se osigurao GDPR-compliant pristup osobnim podacima prema korisničkim rolama.

## Implementacija

### Backend Middleware

- **Lokacija**: `backend/src/middleware/sanitization.middleware.ts`
- **Funkcionalnost**: Automatski sanitizira sve JSON response-ove
- **Aktivacija**: Middleware registriran u `app.ts`

### Utility Functions

- **Lokacija**: `backend/src/utils/sanitization.ts`
- **Funkcionalnost**: 
  - Whitelist pristup podacima prema roli
  - Maskiranje osjetljivih polja
  - Rekurzivna sanitizacija objekata i array-eva

## Pristup podacima prema roli

### Obični članovi (role: member)
- Pristup javnim podacima drugih članova
- Maskirani osjetljivi identifikatori
- Puni pristup vlastitim podacima

### Administratori (role: member_administrator)
- Pristup proširenom setu podataka
- Ograničen pristup kritičnim identifikatorima

### Superuseri (role: member_superuser)
- Puni pristup svim podacima
- Bez sanitizacije

## Sigurnosne mjere

1. **Automatska sanitizacija**: Svi response-ovi automatski sanitizirani
2. **Whitelist pristup**: Samo eksplicitno dozvoljeni podaci proslijeđeni klijentu
3. **Maskiranje**: Kritični identifikatori maskirani za neautorizirane korisnike
4. **Vlastiti profil**: Svaki korisnik ima puni pristup svojim podacima

## GDPR Compliance

- ✅ Minimizacija podataka (data minimization)
- ✅ Pristup ograničen na potrebno (need-to-know basis)
- ✅ Zaštita osobnih podataka
- ✅ Transparentnost obrade podataka

## Testing

Za testiranje sanitizacije:
1. Logirati se kao obični član
2. Otvoriti DevTools Network tab
3. Pregledati API response-ove
4. Verificirati da nisu vidljivi osjetljivi podaci drugih članova
