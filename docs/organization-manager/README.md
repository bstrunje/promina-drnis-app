# Organization System Manager Documentation

Dokumentacija za Organization System Manager (OSM) - upravljanje jednom organizacijom.

## Razlika između OSM i GSM

### 🏢 Organization System Manager (OSM)
- **Opseg:** Jedna organizacija (`organization_id != null`)
- **Pristup:** Upravljanje samo svojom organizacijom
- **Ograničenja:** Ne može kreirati nove organizacije

### 🌐 Global System Manager (GSM)  
- **Opseg:** Sve organizacije (`organization_id = null`)
- **Pristup:** Upravljanje cijelom platformom
- **Ovlasti:** Kreiranje organizacija, upravljanje GSM postavkama

## Funkcionalnosti OSM-a

### ✅ Što OSM može raditi
- Upravljanje članovima svoje organizacije
- Sistemske postavke organizacije
- Audit logovi organizacije
- Dodjela lozinki i uloga članovima
- Upravljanje dozvolama članova
- 2FA postavke za organizaciju
- Holiday management
- Duty calendar postavke

### ❌ Što OSM ne može raditi
- Kreiranje novih organizacija
- Pristup drugim organizacijama
- Upravljanje globalnim postavkama
- Kreiranje drugih System Manager-a za druge organizacije

## Dokumenti

- **[OSM Guide](./osm-guide.md)** - Potpuni vodič za OSM
- **[API Reference](./api-reference.md)** - API dokumentacija za OSM
