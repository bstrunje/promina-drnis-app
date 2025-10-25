# Dokumentacija

**Verzija:** 2025-10-25  
**Status:** ✅ Multi-tenant aplikacija s potpunim branding sustavom  
**Okruženje:** Produkcija na Vercel, lokalni razvoj s Docker podrškom

---

## 📚 Pregled dokumentacije

Dokumentacija je organizirana prema ulogama korisnika u sustavu. Svaka uloga ima svoje specifične funkcionalnosti i pristupe.

### 📖 Struktura dokumentacije

#### 👥 Members (Članovi organizacije)
- **[Member Guide](./members/member-guide.md)** - Vodič za osnovne članove
- **[Administrator Guide](./members/administrator-guide.md)** - Vodič za administratore
- **[Superuser Guide](./members/superuser-guide.md)** - Vodič za superusere
- **[API Reference](./members/api-reference.md)** - API dokumentacija za članove

#### 🏢 Organization System Manager (OSM)
- **[OSM Guide](./organization-manager/osm-guide.md)** - Vodič za OSM
- **[API Reference](./organization-manager/api-reference.md)** - API dokumentacija za OSM

#### 🌐 Global System Manager (GSM)
- **[GSM Guide](./global-manager/gsm-guide.md)** - Vodič za GSM
- **[API Reference](./global-manager/api-reference.md)** - API dokumentacija za GSM

---

## 🎯 Hijerarhija korisnika

```
┌─────────────────────────────────────────────────────────────┐
│  GLOBAL SYSTEM MANAGER (GSM)                                 │
│  • organization_id = null                                    │
│  • Pristup svim organizacijama                              │
│  • Kreiranje organizacija                                   │
│  • Upravljanje OSM-ovima                                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  ORGANIZATION SYSTEM MANAGER (OSM)                           │
│  • organization_id = [specific_id]                          │
│  • Upravljanje jednom organizacijom                         │
│  • Sistemske postavke organizacije                          │
│  • Registracija članova                                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  MEMBERS (Članovi organizacije)                             │
│  ├─ Superuser (member_superuser)                           │
│  │  • Sve admin ovlasti + sistemske postavke org.          │
│  │  • Dodjela uloga                                        │
│  │  • Brisanje podataka                                    │
│  │                                                          │
│  ├─ Administrator (member_administrator)                    │
│  │  • Upravljanje članovima                               │
│  │  • Kreiranje aktivnosti                                │
│  │  • Upravljanje markicama i opremom                     │
│  │  • Slanje poruka                                        │
│  │                                                          │
│  └─ Member (member)                                         │
│     • Upload profilne slike                                │
│     • Slanje poruke administratoru                         │
└─────────────────────────────────────────────────────────────┘
---

## 🔑 Ključne razlike

### GSM vs OSM
| Značajka | GSM | OSM |
|----------|-----|-----|
| **organization_id** | `null` | Specifičan ID |
| **Pristup organizacijama** | Sve organizacije | Samo vlastita |
| **Kreiranje organizacija** | ✅ Da | ❌ Ne |
| **Upravljanje OSM-ovima** | ✅ Da | ❌ Ne |
| **Sistemske postavke org.** | ❌ Ne (to radi OSM) | ✅ Da |
| **Registracija članova** | ❌ Ne (to radi OSM) | ✅ Da |
| **Cross-org audit logs** | ✅ Da | ❌ Ne |

### OSM vs Member Superuser
| Značajka | OSM | Member Superuser |
|----------|-----|------------------|
| **Tip korisnika** | SystemManager | Member |
| **Registracija članova** | ✅ Da | ❌ Ne |
| **Sistemske postavke** | ✅ Da | ✅ Da (ograničeno) |
| **Dodjela lozinki** | ✅ Da | ❌ Ne |
| **Upravljanje članovima** | ❌ Ne (to rade members) | ✅ Da |
| **Kreiranje aktivnosti** | ❌ Ne | ✅ Da |

---

## 📖 Brzi linkovi

### 👥 [MEMBERS](./members/)
Dokumentacija za članove organizacije (sve razine)
- **[Member Guide](./members/member-guide.md)** - Vodič za osnovne članove
- **[Administrator Guide](./members/administrator-guide.md)** - Vodič za administratore
- **[Superuser Guide](./members/superuser-guide.md)** - Vodič za superusere
- **[Member API Reference](./members/api-reference.md)** - API dokumentacija za member funkcionalnosti

### 🏢 [ORGANIZATION SYSTEM MANAGER](./organization-manager/)
Dokumentacija za Organization System Manager (OSM)
- **[OSM Guide](./organization-manager/osm-guide.md)** - Potpuni vodič za OSM
- **[OSM API Reference](./organization-manager/api-reference.md)** - API dokumentacija za OSM

### 🌐 [GLOBAL SYSTEM MANAGER](./global-manager/)
Dokumentacija za Global System Manager (GSM)
- **[GSM Guide](./global-manager/gsm-guide.md)** - Potpuni vodič za GSM
- **[GSM API Reference](./global-manager/api-reference.md)** - API dokumentacija za GSM

---

## 🔧 Tehnička dokumentacija

### 📋 Osnove
- **[Installation Guide](./technical/installation.md)** - Instalacija i pokretanje
- **[Architecture Overview](./technical/architecture.md)** - Arhitektura aplikacije
- **[Database Schema](./technical/database-schema.md)** - Struktura baze podataka
- **[Multi-Tenant System](./technical/multi-tenant.md)** - Multi-tenant implementacija

### 🔐 Sigurnost i autentifikacija
- **[Authentication System](./technical/authentication.md)** - Sustav autentifikacije
- **[Authorization & Permissions](./technical/authorization.md)** - Autorizacija i dozvole
- **[Security Best Practices](./technical/security.md)** - Sigurnosne najbolje prakse

### 🛠️ Razvoj
- **[Development Setup](./technical/development-setup.md)** - Postavljanje razvojnog okruženja
- **[API Documentation](./technical/api-documentation.md)** - Potpuna API dokumentacija
- **[Frontend Architecture](./technical/frontend-architecture.md)** - Frontend arhitektura
- **[Backend Architecture](./technical/backend-architecture.md)** - Backend arhitektura

### 🚀 Deployment i održavanje
- **[Deployment Guide](./technical/deployment.md)** - Deployment na Vercel
- **[Environment Configuration](./technical/environment.md)** - Konfiguracija okruženja
- **[Backup & Recovery](./technical/backup-recovery.md)** - Sigurnosne kopije i oporavak
- **[Monitoring & Logging](./technical/monitoring.md)** - Praćenje i logiranje

---

## 🆕 Najnovije promjene

### Listopad 2025
- ✅ **Multi-tenant branding sustav** - Dinamički logo, boje, nazivi
- ✅ **Organization Management** - GSM može kreirati i upravljati organizacijama
- ✅ **Tenant middleware** - Automatska detekcija organizacije po subdomeni
- ✅ **Frontend multi-tenant** - BrandingContext i dinamički UI
- ✅ **Equipment Management** - Sustav za opremu (majice, jakne, kape)
- ✅ **Activity Management** - Poboljšan sustav aktivnosti s ulogama
- ✅ **Lokalizacija** - HR/EN podrška kroz i18next

### Rujan 2025
- ✅ **Prisma ORM migracija** - Potpuna migracija s legacy SQL-a
- ✅ **Refresh token sustav** - Sigurniji autentifikacijski sustav
- ✅ **Docker podrška** - Lokalni razvoj s Docker Compose
- ✅ **Vercel deployment** - Produkcijska platforma

---

## 🎯 Brzi start

### Za nove korisnike
1. Pročitajte [Installation Guide](./technical/installation.md)
2. Odaberite svoju ulogu i pročitajte odgovarajući vodič
3. Pogledajte [API Documentation](./technical/api-documentation.md) za integracije

### Za developere
1. [Development Setup](./technical/development-setup.md)
2. [Architecture Overview](./technical/architecture.md)
3. [Frontend](./technical/frontend-architecture.md) i [Backend Architecture](./technical/backend-architecture.md)

### Za administratore
1. [Deployment Guide](./technical/deployment.md)
2. [Environment Configuration](./technical/environment.md)
3. [Backup & Recovery](./technical/backup-recovery.md)

---

## 📞 Podrška

Za tehnička pitanja ili podršku:
- Provjerite odgovarajuću dokumentaciju za vašu ulogu
- Pogledajte API dokumentaciju za specifične endpointe
- Kontaktirajte tim za razvoj za dodatnu pomoć

---

*Dokumentacija se redovito ažurira. Zadnje ažuriranje: 25. listopad 2025.*
