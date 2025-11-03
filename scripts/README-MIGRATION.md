# Multi-Tenant Migration Guide

## 📋 Pregled

Ova dokumentacija opisuje proces migracije postojeće single-tenant aplikacije (PD Promina Drniš) u multi-tenant arhitekturu.

---

## 🎯 Što Migracija Radi

### 1. **Dodaje Organization Model**
- Kreira `organizations` tablicu
- Dodaje `organization_id` kolonu u 18 tablica

### 2. **Migrira Postojeće Podatke**
- Kreira organizaciju "PD Promina Drniš" (ID: 1)
- Postavlja `organization_id = 1` za sve postojeće zapise
- Verifikacija da nema zapisa bez organization_id

### 3. **Dodaje Constraints i Indexe**
- 24 indexa za performanse
- 12 unique constraints za multi-tenant izolaciju

---

## ⚡ KAKO POKRENUTI MIGRACIJU

### **Korak 1: Backup baze podataka** ⚠️ OBAVEZNO!

```powershell
cd backend

# OPCIJA A: Docker backup (ako koristiš Docker)
docker exec -it promina-test-db pg_dump -U testuser testdb > backup-before-migration.sql

# OPCIJA B: Lokalni pg_dump (PostgreSQL na 127.0.0.1:5432 - PRODUKCIJSKA BAZA)
$env:PGPASSWORD="Listopad24`$"; pg_dump -U bozos -h 127.0.0.1 -p 5432 promina_drnis_db > backup-before-migration.sql

# NAPOMENA: Koristi Docker za testiranje, lokalnu bazu za produkciju!
```

### **Korak 2: Generiraj Prisma tipove**

```powershell
npx prisma generate
```

**Očekivano**: Trebalo bi biti uspješno, bez grešaka.

### **Korak 3: Kreiraj i primijeni Prisma migraciju**

```powershell
npx prisma migrate dev --name add_multi_tenant_support
```

**Što se događa:**
- Kreira `organizations` tablica
- Dodaje `organization_id` kolonu u 18 tablica (NULL allowed)
- Dodaje indexe i constraints

**⚠️ VAŽNO**: Nakon ovog koraka, svi `organization_id` zapisi su NULL!

### **Korak 4: Pokreni Data Migration Skriptu**

```powershell
npx ts-node src/scripts/migrate-to-multi-tenant.ts
```

**Što skripta radi:**

1. ✅ Kreira organizaciju "PD Promina Drniš"
2. ✅ Postavlja `organization_id = 1` u 18 tablica
3. ✅ Verifikacija - provjerava da nema NULL organization_id
4. ✅ Rollback ako bilo što krene po zlu

**Očekivani output:**

```
🚀 Pokretanje multi-tenant migracije...

📋 KORAK 1: Kreiranje organizacije PD Promina Drniš
   ✅ Organizacija kreirana (ID: 1)

📋 KORAK 2: Ažuriranje postojećih zapisa s organization_id = 1
   ✅ Members ažurirano: 145 zapisa
   ✅ ActivityType ažurirano: 12 zapisa
   ✅ Activity ažurirano: 87 zapisa
   ... (svih 18 tablica)

📋 KORAK 3: Verifikacija migracije
   ✅ Svi zapisi imaju organization_id

🎉 Migracija uspješno završena!
✅ Skripta završena uspješno.
```

### **Korak 5: Verifikacija**

```powershell
# Provjeri da organizacija postoji
npx prisma studio

# Ili SQL query
psql -U postgres -d promina_db -c "SELECT * FROM organizations;"
```

### **Korak 6 (OPCIONO): Make organization_id NOT NULL**

Ako želiš učiniti `organization_id` obaveznim:

```sql
-- Pokreni ovo NAKON uspješne data migracije
ALTER TABLE members ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE activity_types ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE activities ALTER COLUMN organization_id SET NOT NULL;
-- ... itd. za sve tablice
```

Ili kreiraj novu Prisma migraciju s promjenama u schema.prisma.

---

## 🔍 Što Ako Nešto Krene Po Zlu?

### **Scenario 1: Prisma migrate fail**

```powershell
# Resetuj migraciju
npx prisma migrate reset

# DOCKER: Obnovi backup u Docker kontejner
Get-Content backup-before-migration.sql | docker exec -i promina-test-db psql -U testuser -d testdb

# LOKALNO: Obnovi backup (promina_drnis_db)
$env:PGPASSWORD="Listopad24`$"; psql -U bozos -h 127.0.0.1 -p 5432 -d promina_drnis_db -f backup-before-migration.sql
```

### **Scenario 2: Data migration skripta fail**

Skripta koristi **transakcije**, tako da:
- Automatski rollback na grešku
- Baza ostaje u stanju prije pokretanja skripte
- Možeš popraviti problem i ponovno pokrenuti

### **Scenario 3: Verifikacija fail**

Ako skripta prijavi NULL organization_id zapise:

```powershell
# Docker
docker exec -it promina-test-db psql -U testuser -d testdb -c "SELECT 'members' as table_name, COUNT(*) as count FROM members WHERE organization_id IS NULL;"

# Lokalno
$env:PGPASSWORD="Listopad24`$"
psql -U bozos -h 127.0.0.1 -p 5432 -d promina_drnis_db -c "SELECT 'members' as table_name, COUNT(*) as count FROM members WHERE organization_id IS NULL;"
```

---

## 📊 Tablice Koje Se Migriraju

| # | Tablica | Razlog |
|---|---------|--------|
| 1 | members | Osnovni tenant isolation |
| 2 | activity_types | Tipovi aktivnosti po organizaciji |
| 3 | activities | Aktivnosti po organizaciji |
| 4 | activity_participations | Sudionici u aktivnostima |
| 5 | skills | Vještine specifične za org |
| 6 | system_settings | Postavke po organizaciji |
| 7 | stamp_inventory | Inventar markica |
| 8 | equipment_inventory | Inventar opreme |
| 9 | member_messages | Poruke unutar organizacije |
| 10 | audit_logs | Audit log po organizaciji |
| 11 | card_numbers | Brojevi kartica |
| 12 | system_manager | System manager po org |
| 13 | holidays | Praznici po organizaciji |
| 14 | membership_periods | Periodi članstva |
| 15 | annual_statistics | Godišnje statistike |
| 16 | consumed_card_numbers | Iskorišteni brojevi |
| 17 | member_administrator | Admin korisnici |
| 18 | stamp_history | Arhiva markica |

---

## ✅ Checklist

- [ ] Backup baze podataka
- [ ] `npx prisma generate` - uspješno
- [ ] `npx prisma migrate dev` - uspješno
- [ ] `npx ts-node src/scripts/migrate-to-multi-tenant.ts` - uspješno
- [ ] Verifikacija: organizacija kreirana
- [ ] Verifikacija: svi zapisi imaju organization_id
- [ ] Test: aplikacija radi normalno
- [ ] (Opciono) Postavi organization_id NOT NULL

---

## 🚀 Nakon Uspješne Migracije

1. ✅ Commit promjena u Git
2. ✅ Deploy na staging/produkciju
3. ✅ Implementiraj tenant middleware
4. ✅ Refaktoriraj repositorije
5. ✅ Testiraj s dvije organizacije

---

## 📞 Pomoć

Ako nešto krene po zlu:
1. Provjerit backup prije bilo kakvih akcija
2. Pregledaj error log
3. Provjeri da Docker kontejneri rade
4. Testiraj na dev bazi prije produkcije

---

**Zadnje ažurirano:** 2025-10-03  
**Autor:** Cascade AI
