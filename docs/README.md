# Dokumentacija - Multi-Tenant Planinarska Aplikacija

Dobrodošli u dokumentaciju multi-tenant sustava za upravljanje planinarskim društvima.

**Zadnje ažuriranje:** 7. listopad 2025.  
**Status:** ✅ Multi-tenant branding potpuno implementiran

---

## 📚 Sadržaj dokumentacije

### 🌐 Multi-Tenant Implementacija (⭐ NOVO)
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Brzi pregled multi-tenant implementacije
- **[branding-system-implementation.md](branding-system-implementation.md)** ⭐ - Potpuni vodič za branding sistem
- **[multi-tenant-implementation.md](multi-tenant-implementation.md)** - Detaljna implementacija multi-tenancy
- **[multi-tenant-next-steps.md](multi-tenant-next-steps.md)** - Sljedeći koraci i roadmap
- **[multi-tenant-bug-fixes.md](multi-tenant-bug-fixes.md)** - Bug fix-ovi i rješenja
- **[organization-management-implementation.md](organization-management-implementation.md)** - Organization Management sustav
- **[organization-creation-flow.md](organization-creation-flow.md)** - Flow za kreiranje organizacija
- **[tenant-middleware-usage.md](tenant-middleware-usage.md)** - Korištenje tenant middleware
- **[frontend-multi-tenant-implementation.md](frontend-multi-tenant-implementation.md)** - Frontend multi-tenant
- **[backend-multi-tenant-complete.md](backend-multi-tenant-complete.md)** - Backend multi-tenant

### 🔐 Autentifikacija i autorizacija
- **[auth-system.md](auth-system.md)** - Sustav autentifikacije, JWT tokeni, refresh tokeni, uloge korisnika
- **[prisma-enum-best-practices.md](prisma-enum-best-practices.md)** - Najbolje prakse za rad s Prisma enumima

### 👥 Članovi i članstvo
- **[membership-and-activity-hours-rules.md](membership-and-activity-hours-rules.md)** ⭐ *NOVO* - Pravila za praćenje sati aktivnosti i automatsko završavanje članstava
- **[member-status-sync-fixes.md](member-status-sync-fixes.md)** - Ispravke u sustavu sinkronizacije statusa članova

### 📊 Aktivnosti i statistika
- **[aktivnosti.md](aktivnosti.md)** - Modul aktivnosti, vrste aktivnosti, uloge sudionika
- **[annual-statistics.md](annual-statistics.md)** - Sustav za godišnju statistiku aktivnosti i odrađenih sati
- **[date-time-standardization.md](date-time-standardization.md)** - Standardizacija rada s datumima i vremenom

### 🎫 Markice (Stamps)
- **[stamp-module-localization.md](stamp-module-localization.md)** ⭐ *NOVO* - Lokalizacija stamp modula (HR/EN)

### 💬 Komunikacija
- **[messages.md](messages.md)** - Sustav poruka između članova i administratora

### 🔧 Tehnička dokumentacija
- **[api-docs.md](api-docs.md)** - API dokumentacija, endpointi, formati odgovora
- **[frontend-architecture.md](frontend-architecture.md)** - Arhitektura frontend dijela aplikacije
- **[prisma-coding-practices.md](prisma-coding-practices.md)** - Najbolje prakse za Prisma ORM
- **[refactoring-member-controller.md](refactoring-member-controller.md)** - Refaktoring member kontrolera
- **[type-sync-process.md](type-sync-process.md)** - Proces sinkronizacije tipova između backend i frontend

### 🛠️ Razvoj i deployment
- **[backup-configuration.md](backup-configuration.md)** - Konfiguracija sustava za sigurnosne kopije
- **[dev-endpoint-debugging.md](dev-endpoint-debugging.md)** - Debug endpointi za razvoj
- **[testing.md](testing.md)** - Testiranje aplikacije

---

## 🆕 Nedavne promjene

### 7. listopad 2025. - Multi-Tenant Branding ✅
- ✅ **branding-system-implementation.md** - Novi dokument s potpunom dokumentacijom:
  - BrandingContext i useBranding hook
  - Null-safe fallback-ovi
  - Dashboard standardizacija
  - Organization Management s System Manager edit
  - Automatsko brisanje resursa
  - Best practices i deployment checklist

- ✅ **Ažurirani dokumenti:**
  - `multi-tenant-next-steps.md` - Faza 3A označena kao završena
  - `multi-tenant-implementation.md` - Uklonjen "hardkodirano" status
  - `frontend-multi-tenant-implementation.md` - Uklonjeni zastarjeli CSS primjeri
  - `IMPLEMENTATION_SUMMARY.md` - Ažurirane sve komponente i statusi
  - `CHANGELOG.md` - Dodana sekcija za 7. listopad

### 4. listopad 2025. - Multi-Tenant Backend
- ✅ **Organization Management** - Potpuno implementiran
- ✅ **Tenant Middleware** - Subdomen detection i cache
- ✅ **Backend Refactoring** - Repository/Service/Controller layer

### 30. rujan 2025. - Business Logic
- ✅ **Pravila za praćenje sati aktivnosti**
- ✅ **Lokalizacija stamp modula**

---

## 🎯 Kako koristiti dokumentaciju

1. **Za nove članove tima**: Počnite s `IMPLEMENTATION_SUMMARY.md` i `branding-system-implementation.md`
2. **Za multi-tenant razvoj**: Čitajte `multi-tenant-implementation.md`, `tenant-middleware-usage.md`
3. **Za backend razvoj**: Pogledajte `api-docs.md`, `prisma-coding-practices.md`
4. **Za frontend razvoj**: Čitajte `frontend-architecture.md`, `frontend-multi-tenant-implementation.md`
5. **Za business logiku**: Pročitajte `membership-and-activity-hours-rules.md`, `annual-statistics.md`
6. **Za branding**: Detaljni vodič u `branding-system-implementation.md`

---

## 📝 Konvencije dokumentacije

- Svi MD fajlovi trebaju imati datum zadnje izmjene
- Novi dokumenti se označavaju s ⭐ *NOVO*
- Zastarjeli dijelovi se označavaju ~~ovako~~ ili se uklanjaju
- Implementirane značajke se označavaju ✅
- Hardkodirane vrijednosti se označavaju ❌ i uklanjaju
- Sve promjene se dokumentiraju u `CHANGELOG.md`

---

## 🔗 Vanjske poveznice

- **Prisma dokumentacija**: https://www.prisma.io/docs
- **React dokumentacija**: https://react.dev
- **TypeScript dokumentacija**: https://www.typescriptlang.org/docs

---

*Dokumentacija se redovito ažurira. Za pitanja ili nejasnoće kontaktirajte tim za razvoj.*
