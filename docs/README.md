# Dokumentacija - Promina Drniš Aplikacija

Dobrodošli u dokumentaciju Promina Drniš aplikacije - sustava za upravljanje planinarskim društvom.

---

## 📚 Sadržaj dokumentacije

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

## 🆕 Nedavne promjene (30. rujan 2025.)

### Dodano:
- ✅ **Pravila za praćenje sati aktivnosti** - novi dokument koji objašnjava:
  - Prikaz sati samo za zadnje 2 godine u profilu
  - Prikazivanje svih godina u povijesnom pregledu
  - Automatsko završavanje članstava nakon 1. ožujka
  - Očuvanje `total_hours` kroz povijest

- ✅ **Lokalizacija stamp modula** - potpuna dokumentacija:
  - 35+ lokaliziranih poruka (HR/EN)
  - Struktura i konvencije
  - Primjeri korištenja
  - Proces dodavanja novih prijevoda

### Ažurirano:
- ✅ **auth-system.md** - Označen refresh token sustav kao implementiran
- ✅ **Preimenovano** `temp_markdown.md` → `prisma-enum-best-practices.md`

---

## 🎯 Kako koristiti dokumentaciju

1. **Za nove članove tima**: Počnite s `auth-system.md` i `frontend-architecture.md`
2. **Za backend razvoj**: Pogledajte `api-docs.md`, `prisma-coding-practices.md`
3. **Za frontend razvoj**: Čitajte `frontend-architecture.md`, `type-sync-process.md`
4. **Za business logiku**: Pročitajte `membership-and-activity-hours-rules.md`, `annual-statistics.md`

---

## 📝 Konvencije dokumentacije

- Svi MD fajlovi trebaju imati datum zadnje izmjene
- Novi dokumenti se označavaju s ⭐ *NOVO*
- Zastarjeli dijelovi se označavaju ~~ovako~~
- Implementirane značajke se označavaju ✅

---

## 🔗 Vanjske poveznice

- **Prisma dokumentacija**: https://www.prisma.io/docs
- **React dokumentacija**: https://react.dev
- **TypeScript dokumentacija**: https://www.typescriptlang.org/docs

---

*Dokumentacija se redovito ažurira. Za pitanja ili nejasnoće kontaktirajte tim za razvoj.*
