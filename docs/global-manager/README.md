# Global System Manager Documentation

Dokumentacija za Global System Manager (GSM) - upravljanje cijelom platformom.

## Razlika između GSM i OSM

### 🌐 Global System Manager (GSM)
- **Opseg:** Cijela platforma (`organization_id = null`)
- **Pristup:** Sve organizacije i globalne postavke
- **Ovlasti:** Kreiranje organizacija, upravljanje platformom

### 🏢 Organization System Manager (OSM)  
- **Opseg:** Jedna organizacija (`organization_id != null`)
- **Pristup:** Samo vlastita organizacija
- **Ograničenja:** Ne može kreirati organizacije

## Funkcionalnosti GSM-a

### ✅ Što GSM može raditi
- Kreiranje novih organizacija
- Upravljanje svim organizacijama (view, update, delete)
- Kreiranje Organization System Manager-a za organizacije (automatski pri kreiranju org.)
- Resetiranje lozinki OSM-a
- Upload/brisanje logo organizacija
- Provjera dostupnosti subdomene

### ❌ Što GSM ne može raditi
- Mijenjanje organization-specific settings (to radi OSM)
- Direktno upravljanje članovima (to radi OSM ili member superuser)
- Pristup audit logovima organizacija (to radi OSM)
- Upravljanje globalnim postavkama (ne postoji u kodu)

## Dokumenti

- **[GSM Guide](./gsm-guide.md)** - Potpuni vodič za GSM
- **[API Reference](./api-reference.md)** - API dokumentacija za GSM
