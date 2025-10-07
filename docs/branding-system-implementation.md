# Branding System - Multi-Tenant Implementation

**Datum:** 2025-10-07  
**Status:** ✅ IMPLEMENTIRANO

---

## 📋 PREGLED

Implementiran je potpuni multi-tenant branding sistem koji omogućava svakoj organizaciji da ima svoj vizualni identitet (boje, logo, naziv) bez hardkodiranih vrijednosti.

---

## 🎨 KLJUČNE KOMPONENTE

### 1. **BrandingContext** (`frontend/src/context/BrandingContext.tsx`)

**Funkcionalnosti:**
- ✅ Automatska detekcija tenant-a iz URL-a (subdomain ili query parametar)
- ✅ Dohvaćanje branding podataka iz API-ja
- ✅ Caching u localStorage (5 min TTL)
- ✅ Dinamičko postavljanje CSS varijabli

**Tenant Detection:**
```typescript
// Produkcija - subdomain
subdomain.example.com → tenant: "subdomain"

// Development - query parametar
localhost:5173?branding=sv-roko → tenant: "sv-roko"

// Fallback
localhost:5173 → tenant: "default" (prva org iz baze)
```

---

### 2. **useBranding Hook** (`frontend/src/hooks/useBranding.ts`)

**Utility funkcije:**
```typescript
const {
  getLogoUrl,           // string | null
  getPrimaryColor,      // string (default: #000000)
  getSecondaryColor,    // string (default: #e2e4e9)
  getShortName,         // string | null
  getFullName,          // string | null
  getContactEmail,      // string | null
  // ... ostale funkcije
} = useBranding();
```

**Fallback vrijednosti:**
- **Logo:** `null` (ne prikazuje se ako nema)
- **Primary color:** `#000000` (crna)
- **Secondary color:** `#e2e4e9` (svijetlo siva)
- **Naziv/Email:** `null` (ne prikazuje se ako nema)

---

### 3. **CSS Varijable** (`frontend/src/styles/branding.css`)

**Default vrijednosti:**
```css
:root {
  --primary-color: #000000;
  --secondary-color: #e2e4e9;
  --primary-hover: #333333;
  --primary-light: #666666;
  --primary-dark: #000000;
}
```

**❌ VAŽNO:** Ne hardkodiraj tenant-specifične stilove!
```css
/* ❌ NE RADITI OVO */
[data-tenant="promina"] {
  --primary-color: #dc2626;
}

/* ✅ Boje se postavljaju dinamički iz BrandingContext-a */
```

---

## 🔧 BACKEND API

### Tenant Middleware

**Query parametar podrška:**
```typescript
// Provjeri query parametre za tenant (development)
const tenantQuery = req.query.tenant ?? req.query.branding;
const subdomain = tenantQuery ?? extractSubdomain(host);
```

**Primjeri:**
```http
GET /api/org-config/branding?tenant=sv-roko
GET /api/org-config/branding?branding=sv-roko
```

### Branding Endpoint

```http
GET /api/org-config/branding
```

**Response:**
```json
{
  "id": 2,
  "name": "Planinarski klub Sveti Roko Drniš",
  "short_name": "PK Sv. Roko",
  "subdomain": "sv-roko",
  "logo_path": "/uploads/organization_logos/org-2-xxx.png",
  "primary_color": "#1e40af",
  "secondary_color": "#64748b",
  "email": "info@pk-svroko.hr",
  "phone": "+385 22 XXX XXX",
  "website_url": "https://pk-svroko.hr"
}
```

---

## 🖼️ DASHBOARD STANDARDIZACIJA

Svi dashboardi koriste konzistentan layout:

```tsx
<div className="min-h-screen bg-gray-50">
  <div className="max-w-7xl mx-auto p-4 sm:p-6">
    {/* Dashboard content */}
  </div>
</div>
```

**Dashboardi:**
- ✅ `MemberDashboard.tsx`
- ✅ `AdminDashboard.tsx`
- ✅ `SuperUserDashboard.tsx`

**Welcome kartica (bez loga):**
```tsx
<div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg text-white p-6 mb-6">
  <h1 className="text-xl md:text-2xl font-bold">
    {t('welcome', { name: member.full_name })}
  </h1>
</div>
```

---

## 📝 ORGANIZATION MANAGEMENT

### System Manager Edit

**Editable polja:**
```typescript
// Organization data
name, short_name, email, phone, website_url
primary_color, secondary_color
ethics_code_url, privacy_policy_url, membership_rules_url

// System Manager data (optional)
sm_username, sm_email, sm_display_name
sm_password // Samo ako se mijenja
```

**Backend update:**
```typescript
PUT /api/system-manager/organizations/:id
{
  "name": "...",
  "sm_username": "admin_username",
  "sm_password": "new_password" // Optional
}
```

---

## 🗑️ AUTOMATSKO BRISANJE RESURSA

### Logo Cleanup

Kada se briše organizacija, automatski se briše i logo:

```typescript
// Vercel Blob
if (logo_path.startsWith('https://')) {
  await del(logo_path);
}

// Lokalni disk
if (logo_path.startsWith('/uploads')) {
  await fs.unlink(filePath);
}
```

---

## 🔄 SEED FUNKCIJE

### Refaktorirane za Multi-Tenant

**Exportane funkcije:**
```typescript
// prisma/seed.ts
export async function seedSkills(tx, organizationId = 1) { ... }
export async function seedActivityTypes(tx, organizationId = 1) { ... }
```

**Korištenje u controlleru:**
```typescript
import { seedSkills, seedActivityTypes } from '../../prisma/seed.js';

// Kreiranje nove organizacije
await seedActivityTypes(tx, organization.id);
await seedSkills(tx, organization.id);
await seedSystemSettings(tx, organization.id);
```

---

## 🎯 BEST PRACTICES

### 1. **Null Handling**
```tsx
// ✅ Provjeri null prije prikaza
{getLogoUrl() && (
  <img src={getLogoUrl()!} alt={getFullName() || 'Logo'} />
)}

// ✅ Fallback za tekst
<p>{getContactEmail() || 'Nema email-a'}</p>
```

### 2. **Responsive Design**
```tsx
// ✅ Responsive font veličine
<h1 className="text-xl md:text-2xl font-bold">

// ✅ Responsive padding
<div className="p-4 sm:p-6">
```

### 3. **CSS Varijable**
```tsx
// ✅ Koristi dynamic boje iz branding-a
<div style={{ color: getPrimaryColor() }}>

// ❌ Ne hardkodiraj boje
<div className="text-blue-600"> // NE!
```

### 4. **TypeScript Tipovi**
```typescript
// ✅ Eksplicitni tipovi
const updateData: {
  username?: string;
  email?: string;
} = {};

// ❌ Izbjegavaj 'any'
const updateData: any = {}; // NE!
```

---

## 🧪 TESTIRANJE

### Development Testing

```bash
# Test različitih tenant-a
http://localhost:5173?branding=promina
http://localhost:5173?branding=sv-roko
http://localhost:5173?branding=test
```

### Production Testing

```bash
# Subdomain routing
https://promina.example.com
https://sv-roko.example.com
```

---

## 📊 CACHE MANAGEMENT

**Cache key:** `organization_branding`

**TTL:** 5 minuta

**Invalidacija:**
```typescript
// Automatski se invalidira nakon 5 min
// Ili ručno:
localStorage.removeItem('organization_branding');
```

---

## ⚠️ VAŽNE NAPOMENE

1. ✅ **Sve boje dolaze iz baze** - nema hardkodiranih tenant-specifičnih stilova
2. ✅ **Logo je optional** - ne prikazuje se ako nema
3. ✅ **Responsive dizajn** - svi dashboardi imaju max-width i responsive padding
4. ✅ **Type-safe** - nema `any` tipova, sve je eksplicitno definirano
5. ✅ **Automatski cleanup** - logo se briše kada se briše organizacija

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Backend build bez grešaka (`npm run build`)
- [ ] Frontend build bez grešaka (`npm run build`)
- [ ] Lint provjera (`npm run lint`)
- [ ] Branding podatci u bazi za sve organizacije
- [ ] Logo upload-an za sve organizacije
- [ ] Testirano na različitim tenant-ima
- [ ] Cache invalidacija radi ispravno
- [ ] Responsive dizajn testiran na mobilnom

---

## 📚 POVEZANA DOKUMENTACIJA

- [Multi-Tenant Implementation](./multi-tenant-implementation.md)
- [Organization Management](./organization-management-implementation.md)
- [Tenant Middleware Usage](./tenant-middleware-usage.md)
- [Frontend Architecture](./frontend-architecture.md)
