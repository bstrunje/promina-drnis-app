# Multi-Tenant Implementacija - Sljedeći Koraci

**Datum:** 2025-10-04  
**Status:** 🟢 Faza 1 & 2 Potpuno Završene - Backend Multi-Tenant Ready  
**Prethodne faze:** ✅ Database Schema ✅ Backend Code Migration ✅ Tenant Middleware

---

## 🎯 PREGLED TRENUTNOG STANJA

### ✅ ŠTO JE ZAVRŠENO (Faza 1 & 2 - Backend):
- **Database Schema**: Organization model + 18 tablica s organization_id
- **Prisma Migration**: `20251003084742_add_multi_tenant_support` primijenjena
- **Data Migration**: 497 zapisa migrirano na organization_id = 1 (PD Promina)
- **Tenant Middleware**: Subdomen parsing, cache sistem, fallback logika
- **Repository Layer**: Svi repository-ji refaktorirani za organization_id filtriranje
- **Service Layer**: Sve funkcije primaju `req: Request` i ekstraktuju organizationId
- **Controller Layer**: Svi pozivi prosljeđuju req objekt
- **Public API**: `/api/org-config` endpoints za branding podatke
- **TypeScript Build**: 0 grešaka, potpuno type-safe
- **Git Commit**: `2231bde` - "Backend refaktoriran za multi-tenancy, prelazimo na frontend"

### 🔧 ŠTO SLIJEDI (Faza 3 - Frontend):

#### **VAŽNO: Subdomen Routing Strategija**
Svaka organizacija ima **svoju subdomenu** i **samostalan pristup**:
- `promina.platforma.hr` → PD Promina Drniš (organization_id = 1)
- `velebit.platforma.hr` → PD Velebit (organization_id = 2)
- `dinara.platforma.hr` → PD Dinara (organization_id = 3)

**NEMA UI za odabir organizacije** - tenant se automatski detektira po subdomeni!

---

## ✅ FAZA 3A: FRONTEND BRANDING - ZAVRŠENO

### 1. **Dinamičko Učitavanje Branding-a** ✅
**Status:** 🟢 Potpuno Implementirano  
**Datum završetka:** 2025-10-03

#### Završeni zadaci:
- ✅ **BrandingContext Provider**
  - React Context za organization branding
  - Automatska detekcija tenant-a po subdomeni/query parametru
  - Cache sistem s 5min TTL u localStorage
  - Fallback branding za nepoznate organizacije

- ✅ **API Integration**
  - Tenant-aware API klijent (`http://localhost:3000/api`)
  - Uspješno testiran `/api/org-config/branding` endpoint
  - Error handling s fallback podacima

- ✅ **CSS Branding System**
  - CSS varijable za dinamičke boje i logo
  - Tenant-specifični stilovi (`[data-tenant="promina"]`)
  - Utility klase (.text-primary, .btn-primary, itd.)

- ✅ **Development Tools**
  - BrandingDemo komponenta za testiranje
  - Debug log-ovi za troubleshooting
  - Query parameter support (`?tenant=test`)

- ✅ **Utility Functions**
  - useBranding hook s helper funkcijama
  - tenantUtils za environment detection
  - Type-safe pristup branding podacima

---

## 📋 FAZA 3B: FRONTEND TENANT DETECTION & ROUTING

### 1. **Subdomen Detection** 🔴 KRITIČNO
**Prioritet:** 🔴 Najviši  
**Procjena:** 1 dan

#### Zadaci:
- [ ] **Tenant Detection Utility**
  - Parsing subdomene iz `window.location.hostname`
  - Development fallback (localhost → 'promina')
  - Production subdomen extraction
  - Query parameter override za testiranje (`?tenant=velebit`)

- [ ] **App Bootstrap**
  - Učitavanje organization config-a pri boot-u
  - Redirect na error page za nepoznate subdomene
  - Loading state dok se učitava config
  - Error handling s fallback branding-om

- [ ] **Environment Configuration**
  - Development: localhost → default tenant
  - Staging: subdomen.staging.platforma.hr
  - Production: subdomen.platforma.hr

### 2. **Navigation/Header Komponente**
**Prioritet:** 🔴 Visok  
**Procjena:** 1 dan

#### Zadaci:
- [ ] **Dinamički Logo**
  - Implementirati useBranding hook u Navigation komponenti
  - Logo URL iz organization config-a
  - Fallback na default SVG logo
  - Alt text s organization name

- [ ] **Organization Branding**
  - Organization name u page title i header
  - Primary/secondary boje u navigation bar-u
  - Responsive logo sizing
  - Favicon dinamizacija

- [ ] **Header Styling**
  - CSS varijable za branding boje
  - Hover efekti s primary/secondary bojama
  - Tenant-specific styling (`[data-tenant="promina"]`)

#### Datoteke za ažuriranje:
```
frontend/src/
├── components/Navigation.tsx        # AŽURIRATI - dodati useBranding
├── components/Layout/Header.tsx     # AŽURIRATI (ako postoji)
└── index.html                       # AŽURIRATI - dinamički title
```

### 2. **Dashboard Komponente**
**Prioritet:** 🟡 Srednji  
**Procjena:** 1 dan

#### Zadaci:
- [ ] **Branding u Kartama**
  - Dashboard kartice s organization bojama
  - Primary color za akcente i bordere
  - Organization name u dashboard header-u

- [ ] **Welcome Messages**
  - Personalizirani pozdrav s organization name
  - Branding-aware ikone i boje

#### Datoteke za ažuriranje:
```
frontend/src/features/dashboard/
├── MemberAdministratorDashboard.tsx  # AŽURIRATI
├── MemberDashboard.tsx               # AŽURIRATI
└── DashboardHeader.tsx               # AŽURIRATI
```

### 3. **Footer Komponente**
**Prioritet:** 🟢 Nizak  
**Procjena:** 0.5 dana

#### Zadaci:
- [ ] **Kontakt Informacije**
  - Organization email, telefon, adresa
  - Linkovi na website, etički kodeks, pravila
  - Dinamički copyright s organization name

#### Datoteke za ažuriranje:
```
frontend/src/
└── components/Layout/Footer.tsx     # KREIRATI ili AŽURIRATI
```

### 3. **Subdomen Routing**
**Prioritet:** 🟡 Srednji  
**Procjena:** 1 dan

#### Zadaci:
- [ ] **Router Configuration**
  - Tenant detection u React Router
  - Redirect logic za nepoznate subdomene

- [ ] **Environment Detection**
  - Development vs Production routing
  - Localhost fallback logika

---

## 📋 FAZA 3C: SYSTEM MANAGER INTERFACE

### **VAŽNO: Dva Odvojena Entiteta**

#### **1. SYSTEM MANAGER** (Tehnički Administrator)
- **Tablica:** `system_manager`
- **Autentikacija:** username/password
- **Scope:** 
  - `organization_id = null` → **Globalni SM** (upravlja svim organizacijama)
  - `organization_id != null` → **Org-specific SM** (upravlja samo svojom org)
- **Pristup:** Organization Management UI

#### **2. MEMBER** (Članski Entitet)
- **Tablica:** `members`
- **Uloge:** `member`, `member_administrator`, `member_superuser`
- **Autentikacija:** email/password ili card_number/password
- **Scope:** Samo svoja organizacija
- **Pristup:** **NEMA** pristup Organization Management-u

---

### 1. **Organization Management** (SAMO GLOBALNI SYSTEM MANAGER)
**Prioritet:** 🔴 Visok  
**Procjena:** 3-4 dana

#### Zadaci:
- [ ] **System Manager Dashboard** (Globalni System Manager)
  - Lista svih organizacija
  - Organization CRUD operacije
  - Branding upload interface
  - **Autorizacija:** `organization_id = null` required

- [ ] **Organization Creation Flow**
  - **Korak 1:** Osnovne informacije organizacije
  - **Korak 2:** Branding (logo, boje)
  - **Korak 3:** Kreiranje System Manager-a za novu organizaciju
  - **Korak 4:** Seed inicijalni podaci (activity types, skills)
  - **Rezultat:** Nova organizacija + org-specific System Manager

- [ ] **Organization Form**
  - Osnovne informacije (naziv, subdomen, email, telefon)
  - Branding (logo upload, primary/secondary boje)
  - Dokumenti (pravila, etički kodeks, privacy policy)
  - System Manager podaci (username, email, password)

#### Backend Endpoints:
```typescript
POST   /api/system-manager/organizations          // Kreiranje nove org
GET    /api/system-manager/organizations          // Lista svih org
GET    /api/system-manager/organizations/:id      // Detalji org
PUT    /api/system-manager/organizations/:id      // Ažuriranje org
DELETE /api/system-manager/organizations/:id      // Brisanje org
POST   /api/system-manager/organizations/:id/logo // Upload logo
```

#### Nove komponente:
```
frontend/src/features/systemManager/
├── OrganizationList.tsx            # NOVO - Lista svih org (globalni SM)
├── OrganizationForm.tsx            # NOVO - Multi-step forma
├── OrganizationCreationWizard.tsx  # NOVO - Wizard za kreiranje
├── BrandingUpload.tsx              # NOVO - Logo upload
└── SystemManagerDashboard.tsx      # NOVO - Dashboard za SM
```

### 2. **Tenant Onboarding**
**Prioritet:** 🟢 Nizak  
**Procjena:** 2-3 dana

#### Zadaci:
- [ ] **Registration Flow**
  - Multi-step organization registration
  - Email verifikacija
  - Initial setup wizard

- [ ] **Subdomain Management**
  - Subdomain availability check
  - DNS setup instrukcije

### 3. **Multi-Tenant Dashboard**
**Prioritet:** 🟢 Nizak  
**Procjena:** 2 dana

#### Zadaci:
- [ ] **System Overview**
  - Statistike po organizacijama
  - Resource usage monitoring
  - Performance metrics

---

## 📋 FAZA 3C: TESTING & DEPLOYMENT

### 1. **Multi-Tenant Testing**
**Prioritet:** 🔴 Visok  
**Procjena:** 2-3 dana

#### Zadaci:
- [ ] **Test Organization Setup**
  - Kreirati test organizaciju u bazi
  - Test subdomen konfiguracija
  - Cross-tenant isolation testiranje

- [ ] **E2E Testing**
  - Cypress testovi za multi-tenant scenarije
  - Branding loading testovi
  - API isolation testovi

### 2. **Production Deployment**
**Prioritet:** 🔴 Visok  
**Procjena:** 1-2 dana

#### Zadaci:
- [ ] **DNS Configuration**
  - Wildcard subdomain setup
  - SSL certifikati za subdomene

- [ ] **Environment Variables**
  - Production tenant configuration
  - API endpoint konfiguracija

- [ ] **Performance Monitoring**
  - Tenant-specific analytics
  - Error tracking po organizaciji

---

## 🎯 PRIORITETNI REDOSLIJED

### **Tjedan 1 (Dani 1-7):**
1. ✅ Database Schema (Završeno)
2. ✅ Backend Code Migration (Završeno)
3. 🔄 **Dinamičko Učitavanje Branding-a** (U tijeku)

### **Tjedan 2 (Dani 8-14):**
4. Tenant-Aware API Pozivi
5. Multi-Tenant Testing
6. Test Organization Setup

### **Tjedan 3 (Dani 15-21):**
7. System Manager Interface - Organization Management
8. Production Deployment
9. Performance Monitoring

### **Tjedan 4+ (Opcijski):**
10. Tenant Onboarding Flow
11. Advanced System Manager Features
12. Multi-Tenant Dashboard

---

## 🔧 TEHNIČKI DETALJI

### **Branding API Response:**
```typescript
interface OrganizationBranding {
  id: number;
  name: string;
  subdomain: string;
  short_name: string;
  logo_path: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  email: string;
  phone: string | null;
  website_url: string | null;
  // ... ostala polja
}
```

### **Frontend Environment Detection:**
```typescript
const getTenantFromUrl = (): string => {
  const hostname = window.location.hostname;
  
  // Development
  if (hostname.includes('localhost')) {
    return 'promina'; // Default za development
  }
  
  // Production
  const subdomain = hostname.split('.')[0];
  return subdomain;
};
```

### **CSS Varijable za Branding:**
```css
:root {
  --primary-color: #2563eb;    /* Default plava */
  --secondary-color: #64748b;  /* Default siva */
  --logo-url: url('/default-logo.png');
}

[data-tenant="promina"] {
  --primary-color: #dc2626;    /* Promina crvena */
  --secondary-color: #991b1b;
}
```

---

## 📞 SLJEDEĆI KORAK

**Preporučujem početak s Fazom 3A - Dinamičko Učitavanje Branding-a** jer je:
- Najviše vidljivo korisniku
- Relativno jednostavno za implementaciju
- Temelj za ostale multi-tenant funkcionalnosti

Želite li početi s implementacijom branding context-a i API integracije?
