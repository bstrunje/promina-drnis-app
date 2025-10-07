# Changelog - Dokumentacija

Ovaj fajl prati važne promjene u dokumentaciji.

---

## [7. listopad 2025.]

### Dodano 📝

#### Novi dokumenti:
1. **`branding-system-implementation.md`**
   - Potpuna dokumentacija multi-tenant branding sistema
   - BrandingContext i useBranding hook
   - CSS varijable i fallback vrijednosti
   - Dashboard standardizacija
   - Organization management s System Manager edit
   - Automatsko brisanje resursa (logo cleanup)
   - Best practices i deployment checklist

### Promijenjeno 🔄

#### Backend:
1. **`organization.controller.ts`**
   - ✅ Dodani System Manager podaci u `getOrganizationById` response
   - ✅ Dodana mogućnost ažuriranja SM podataka u `updateOrganization`
   - ✅ Automatsko brisanje loga pri brisanju organizacije
   - ✅ Uklonjena provjera članova prije brisanja (CASCADE briše sve)
   - ✅ TypeScript tip umjesto `any` za updateData

#### Frontend:
1. **`useBranding.ts`**
   - ✅ Svi fallback-ovi postavljeni na `null` ili neutralne boje
   - ✅ Primary color: `#000000` (crna)
   - ✅ Secondary color: `#e2e4e9` (svijetlo siva)
   - ✅ Logo, naziv, email vraćaju `null` ako nema podataka

2. **`branding.css`**
   - ❌ Uklonjeni hardkodirani tenant-specifični stilovi
   - ✅ Postavljene neutralne default boje
   - ✅ Dodana napomena da se boje postavljaju dinamički

3. **Dashboard komponente:**
   - ✅ `MemberDashboard.tsx` - standardizirani layout, maknuti logo iz welcome kartice
   - ✅ `AdminDashboard.tsx` - standardizirani layout
   - ✅ `SuperUserDashboard.tsx` - standardizirani layout, responsive font
   - ✅ Svi koriste: `min-h-screen bg-gray-50` + `max-w-7xl mx-auto p-4 sm:p-6`

4. **`OrganizationEdit.tsx`**
   - ✅ Dodana System Manager sekcija (username, email, display_name, password)
   - ✅ Password se mijenja samo ako se unese nova vrijednost

### Implementirano u kodu 💻

**Branding System:**
- ✅ Dinamičke boje iz baze (nema hardkodiranja)
- ✅ Logo optional (ne prikazuje se ako nema)
- ✅ Responsive dizajn na svim dashboard-ima
- ✅ Type-safe (nema `any` tipova)
- ✅ Automatski cleanup resursa

**Organization Management:**
- ✅ Edit System Manager podataka
- ✅ Automatsko brisanje loga
- ✅ CASCADE brisanje svih povezanih podataka

---

## [4. listopad 2025.]

### Dodano 📝

#### Novi dokumenti:
1. **`multi-tenant-bug-fixes.md`**
   - Dokumentacija svih bug fix-ova tijekom multi-tenant implementacije
   - Logo wrapping problem i rješenje
   - Access token duration fix (15m → 24h)
   - Refresh token logika ispravka
   - ESLint greške i rješenja
   - Testiranje i naučene lekcije

#### Ažurirani dokumenti:
1. **`organization-creation-flow.md`**
   - Status promijenjen u ✅ IMPLEMENTIRANO
   - Dodana sekcija "Implementirano" s detaljima
   - Backend i Frontend komponente dokumentirane
   - API endpoints popis

### Promijenjeno 🔄

1. **`frontend-multi-tenant-implementation.md`**
   - Status ažuriran na ✅ POTPUNO ZAVRŠENO
   - Dodana sekcija "Dodatno Implementirano" s 6 kategorija
   - Ažurirane statistike: 22+ komponente, ~2500 linija koda
   - Ažurirani sljedeći koraci

2. **`IMPLEMENTATION_SUMMARY.md`**
   - Status ažuriran na ✅ Backend i Frontend POTPUNO ZAVRŠENI
   - Frontend progress 60% → 100%
   - Dodane sve ažurirane komponente
   - Faza 2 označena kao završena

### Implementirano u kodu 💻

**Frontend promjene - Branding:**
1. **Navigation.tsx** - Logo wrapping fix, dinamički logo
2. **Footer.tsx** - Nova komponenta s kontakt informacijama
3. **LoginPage.tsx** - Dinamički dokumenti i logo
4. **Dashboard komponente** (3):
   - SuperUserDashboard.tsx
   - MemberDashboard.tsx
   - AdminDashboard.tsx
5. **Activities komponente** (6):
   - ActivitiesList.tsx
   - ActivityCategoryPage.tsx
   - ActivityDetailPage.tsx
   - ActivitiesAdminPage.tsx
   - ActivityOverviewPage.tsx
   - ActivityYearPage.tsx
6. **Members komponente** (4):
   - MemberList.tsx
   - AddMemberForm.tsx
   - MemberTable.tsx
   - MembersWithPermissions.tsx
7. **Settings komponente**:
   - CardNumberManagement.tsx
8. **Messages komponente**:
   - MemberMessageList.tsx

**Backend promjene - Auth:**
1. `login.handler.ts` - Access token 15m → 24h
2. `refreshToken.handler.ts` - Access token 15m → 24h, logika ispravka

**Backend promjene - Organization Management:**
1. `systemManager.middleware.ts` - Novi middleware za autorizaciju
2. `organization.controller.ts` - CRUD operacije za organizacije
3. `organization.routes.ts` - API endpoints
4. Seed funkcije za nove organizacije

**Frontend promjene - Organization Management:**
1. `apiOrganizations.ts` - API utility funkcije
2. `OrganizationList.tsx` - Lista organizacija
3. `OrganizationWizard.tsx` - 4-step wizard
4. Wizard steps (4 komponente)
5. Routing integracija

**ESLint Fixes:**
- 11 datoteka ažurirano
- 15+ grešaka ispravljeno
- 0 grešaka preostalo

---

## [30. rujan 2025.]

### Dodano 📝

#### Novi dokumenti:
1. **`membership-and-activity-hours-rules.md`**
   - Pravila za praćenje sati aktivnosti članova
   - Status aktivnosti - samo zadnje 2 godine
   - Povijesni pregled - sve godine vidljive
   - Automatsko završavanje članstava
   - Očuvanje `total_hours` kroz povijest
   - Dijagrami toka i Q&A sekcija

2. **`stamp-module-localization.md`**
   - Potpuna dokumentacija lokalizacije stamp modula
   - 35+ lokaliziranih poruka (HR/EN)
   - Struktura lokalizacijskih fajlova
   - Konvencije i best practices
   - Primjeri korištenja `tOrDefault` funkcije

3. **`README.md`**
   - Glavni index dokumentacije
   - Kategorizacija svih dokumenata
   - Brza navigacija po temama
   - Konvencije dokumentacije

4. **`CHANGELOG.md`**
   - Praćenje promjena u dokumentaciji

### Promijenjeno 🔄

1. **`auth-system.md`**
   - Ažurirana sekcija "Buduća poboljšanja"
   - Refresh token označen kao implementiran ✅
   - Dodane nove ideje za poboljšanja

2. **`prisma-enum-best-practices.md`** (prije: `temp_markdown.md`)
   - Preimenovan fajl za bolju jasnoću
   - Isti sadržaj, bolji naziv

### Implementirano u kodu 💻

**Frontend promjene:**
1. `ActivityOverviewPage.tsx` - Prikazivanje svih godina
2. `MemberActivityStatus.tsx` - Poništavanje sati za inactive članove
3. `MembershipFeeSection.tsx` - Debug button samo u dev modu

**Backend promjene:**
1. `membership.repository.ts` - Očuvanje `total_hours` pri završavanju članstva
2. `stamp.service.ts` - Lokalizacija svih poruka (20+ poruka)
3. `stamp.routes.ts` - Lokalizacija response poruka (15+ poruka)
4. `locales/hr/stamp.json` - Hrvatski prijevodi
5. `locales/en/stamp.json` - Engleski prijevodi

---

## Planirane promjene 🔮

### Uskoro:
- Ažuriranje `annual-statistics.md` s novim pravilima za prikaz sati
- Dokumentacija frontend lokalizacije
- Додаци за testing best practices

### Razmatranje:
- API versioning dokumentacija
- Performance optimization guidelines
- Security best practices dokument
- Deployment workflow dokumentacija

---

## Konvencije za changelog

- **Dodano** - Novi dokumenti ili sekcije
- **Promijenjeno** - Ažuriranja postojećih dokumenata
- **Uklonjeno** - Obrisani ili zastarjeli dijelovi
- **Implementirano** - Promjene u kodu dokumentirane u dokumentaciji
- **Ispravke** - Bug fixes u dokumentaciji

---

*Za pitanja o dokumentaciji, kontaktirajte razvojni tim.*
