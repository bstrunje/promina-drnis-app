# 🛡️ Quick Reference - Backup i Restore Naredbe

## ⚠️ PRIJE MIGRACIJE - BACKUP

### **PowerShell - Docker Backup** (PREPORUČENO)

```powershell
cd backend

# Backup Docker baze
docker exec -it promina-test-db pg_dump -U testuser testdb > backup-before-migration.sql

# Provjera backupa
Get-Item backup-before-migration.sql | Select-Object Name, Length, LastWriteTime
```

---

### **PowerShell - Lokalni Backup** (PostgreSQL na 127.0.0.1:5432)

```powershell
cd backend

# Backup LOKALNE baze promina_drnis_db
$env:PGPASSWORD="Listopad24`$"; pg_dump -U bozos -h 127.0.0.1 -p 5432 promina_drnis_db > backup-before-migration.sql

# Provjera backupa
Get-Item backup-before-migration.sql | Select-Object Name, Length, LastWriteTime
```

---

## 🔄 AKO NEŠTO KRENE PO ZLU - RESTORE

### **PowerShell - Docker Restore**

```powershell
cd backend

# KORAK 1: Očisti postojeću bazu
docker exec -it promina-test-db psql -U testuser -d postgres -c "DROP DATABASE IF EXISTS testdb;"
docker exec -it promina-test-db psql -U testuser -d postgres -c "CREATE DATABASE testdb;"

# KORAK 2: Vrati backup
Get-Content backup-before-migration.sql | docker exec -i promina-test-db psql -U testuser -d testdb

# KORAK 3: Provjeri da je sve OK
docker exec -it promina-test-db psql -U testuser -d testdb -c "\dt"
```

---

### **PowerShell - Lokalni Restore** (promina_drnis_db)

```powershell
cd backend

# KORAK 1: Očisti postojeću bazu
$env:PGPASSWORD="Listopad24`$"
psql -U bozos -h 127.0.0.1 -p 5432 -d postgres -c "DROP DATABASE IF EXISTS promina_drnis_db;"
psql -U bozos -h 127.0.0.1 -p 5432 -d postgres -c "CREATE DATABASE promina_drnis_db;"

# KORAK 2: Vrati backup
psql -U bozos -h 127.0.0.1 -p 5432 -d promina_drnis_db -f backup-before-migration.sql

# KORAK 3: Provjeri da je sve OK
psql -U bozos -h 127.0.0.1 -p 5432 -d promina_drnis_db -c "\dt"
```

---

## 📊 PROVJERA STATUSA BAZE

### **Docker**

```powershell
# Provjeri tablice
docker exec -it promina-test-db psql -U testuser -d testdb -c "\dt"

# Provjeri broj zapisa u members tablici
docker exec -it promina-test-db psql -U testuser -d testdb -c "SELECT COUNT(*) FROM members;"

# Interaktivna psql sesija
docker exec -it promina-test-db psql -U testuser -d testdb
```

### **Lokalno** (promina_drnis_db)

```powershell
$env:PGPASSWORD="Listopad24`$"

# Provjeri tablice
psql -U bozos -h 127.0.0.1 -p 5432 -d promina_drnis_db -c "\dt"

# Provjeri broj zapisa u members tablici
psql -U bozos -h 127.0.0.1 -p 5432 -d promina_drnis_db -c "SELECT COUNT(*) FROM members;"

# Interaktivna psql sesija
psql -U bozos -h 127.0.0.1 -p 5432 -d promina_drnis_db
```

---

## 🎯 KLJUČNE INFORMACIJE

### **Docker Okruženje:**
| Parametar | Vrijednost |
|-----------|------------|
| Container Name | `promina-test-db` |
| Database Name | `testdb` |
| Username | `testuser` |
| Password | `testpassword` |
| Docker Internal Port | `5432` |
| Host Port (Docker) | `5433` |

### **Lokalno Okruženje (Produkcija/Dev):**
| Parametar | Vrijednost |
|-----------|------------|
| Database Name | `promina_drnis_db` |
| Username | `bozos` |
| Password | `Listopad24$` |
| Host | `127.0.0.1` |
| Port | `5432` |

---

## ✅ PROVJERA PRIJE MIGRACIJE

```powershell
# Provjeri da Docker radi
docker ps | Select-String "promina-test-db"

# Provjeri da baza odgovara
docker exec -it promina-test-db pg_isready -U testuser -d testdb

# Kreiraj backup
docker exec -it promina-test-db pg_dump -U testuser testdb > backup-before-migration.sql

# Provjeri da backup nije prazan
$backup = Get-Item backup-before-migration.sql
if ($backup.Length -gt 1KB) {
    Write-Host "✅ Backup kreiran: $($backup.Length) bytes" -ForegroundColor Green
} else {
    Write-Host "❌ Backup je prazan ili premalen!" -ForegroundColor Red
}
```

---

**Zadnje ažurirano:** 2025-10-03  
**Autor:** Cascade AI
