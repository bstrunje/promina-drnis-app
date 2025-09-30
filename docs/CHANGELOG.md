# Changelog - Dokumentacija

Ovaj fajl prati važne promjene u dokumentaciji.

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
