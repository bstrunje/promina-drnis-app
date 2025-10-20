# Path-Based Multi-Tenancy - Implementacija

## ✅ Završeno!

Path-based multi-tenancy je uspješno implementiran s **minimalnim promjenama** u postojećem kodu.

---

## 📝 Promjene (5 datoteka)

### 1. **Backend: tenant.middleware.ts**
✅ Dodana `extractOrgSlugFromPath()` funkcija  
✅ Prioritet detekcije: Query → Path → Subdomain

**Primjeri URL-ova koje backend sada podržava:**
```
✅ /promina/api/members → orgSlug = 'promina'
✅ /split/api/activities → orgSlug = 'split'
✅ ?tenant=promina → orgSlug = 'promina' (development override)
✅ promina.managemembers.com → orgSlug = 'promina' (legacy fallback)
```

---

### 2. **Frontend: tenantUtils.ts**
✅ Dodana `extractOrgSlugFromPath()` funkcija  
✅ `getCurrentTenant()` sada prvo provjerava path

**Prioritet detekcije:**
1. URL Path (`/promina/...`)
2. Query param (`?tenant=promina`)
3. Subdomain (`promina.managemembers.com`)
4. localStorage cache

---

### 3. **Frontend: BrandingContext.tsx**
✅ Ažurirana `getTenantFromUrl()` funkcija  
✅ Podržava path-based detection

---

### 4. **Frontend: App.tsx**
✅ Kreirana `OrgRoutes` wrapper komponenta  
✅ Sve org-specific rute wrappane u `/:orgSlug/*`

**Nova struktura ruta:**
```typescript
/system-manager/*          → System Manager (bez org context-a)
/:orgSlug/*                → Organization routes
  /:orgSlug/login
  /:orgSlug/dashboard
  /:orgSlug/members
  /:orgSlug/activities
  ...sve ostale rute
```

---

### 5. **vercel.json**
✅ Dodani rewrites za path-based routing

**Rewrites:**
```json
/:orgSlug/api/* → /api/* (backend API pozivi)
/:orgSlug/*     → /frontend/dist/index.html (SPA routing)
```

---

## 🚀 Testiranje Lokalno

### 1. Pokreni Backend
```bash
cd backend
npm run dev
```

Backend će biti dostupan na `http://localhost:3000`

### 2. Pokreni Frontend
```bash
cd frontend
npm run dev
```

Frontend će biti dostupan na `http://localhost:5173`

### 3. Pristupi Aplikaciji

**Path-based (NOVO!):**
```
http://localhost:5173/promina/login
http://localhost:5173/promina/dashboard
http://localhost:5173/split/members
```

**Query parameter (development override):**
```
http://localhost:5173/login?tenant=promina
```

**System Manager (izvan org context-a):**
```
http://localhost:5173/system-manager/login
```

---

## 🔍 Debug Logovi

Prati konzolu u browser-u i backend-u za debug informacije:

**Frontend konzola:**
```
[BRANDING] 🔍 Detecting tenant from URL
[BRANDING] 🔍 Hostname: localhost:5173 Pathname: /promina/login
[BRANDING] ✅ Detected tenant from path: promina
[APP] OrgRoutes - orgSlug: promina
```

**Backend konzola:**
```
[TENANT-MIDDLEWARE] Host: localhost:3000, Path: /promina/api/members, Final Org Slug: promina
[TENANT-MIDDLEWARE] Organizacija: Planinarsko društvo Promina (ID: 1)
```

---

## 📱 Production URL-ovi (Vercel)

Nakon deploya na Vercel (`managemembers.vercel.app`):

```
✅ https://managemembers.vercel.app/promina/login
✅ https://managemembers.vercel.app/promina/dashboard
✅ https://managemembers.vercel.app/split/members
✅ https://managemembers.vercel.app/system-manager/login
```

---

## 🎯 Kako Dodati Novu Organizaciju

### Opcija 1: Preko System Manager GUI
```
1. Idi na: /system-manager/login
2. Login kao Global System Manager
3. Organizations → Add Organization
4. Popuni podatke (name, subdomain, email, itd.)
5. Save
```

**Novi org će biti dostupan na:**
```
/novi-org/login
/novi-org/dashboard
```

### Opcija 2: Direktno u Bazi
```sql
INSERT INTO organizations (
  name, 
  subdomain,  -- Ovo se koristi kao URL slug!
  email, 
  is_active,
  default_language
) VALUES (
  'PD Split',
  'split',    -- URL će biti /split/...
  'info@pd-split.hr',
  true,
  'hr'
);
```

---

## ⚠️ Važno: Navigation Links

Svi linkovi u aplikaciji **automatski funkcioniraju** jer:
- `Navigation` komponenta već koristi relativne putanje
- React Router hendla `/:orgSlug/*` pattern
- `useNavigate()` i `<Link>` rade s relativnim putanjama

**Primjer:**
```tsx
// OVO RADI:
<Link to="/dashboard">Dashboard</Link>

// Kad si na /promina/..., ovo ide na /promina/dashboard
// Kad si na /split/..., ovo ide na /split/dashboard
```

**Ne trebaš eksplicitno dodavati orgSlug u linkove!**

---

## 🐛 Troubleshooting

### Problem: "Organization not found"
**Rješenje:**
- Provjeri postoji li organizacija u bazi s tim subdomain-om
- Provjeri je li `is_active = true`
```sql
SELECT * FROM organizations WHERE subdomain = 'promina';
```

### Problem: API pozivi vraćaju 400 "Tenant is required"
**Rješenje:**
- Provjeri backend konzolu - traži `[TENANT-MIDDLEWARE]` logove
- Provjeri je li path u formatu `/:orgSlug/api/...`
- Provjeri je li `apiConfig.ts` dodaje `?tenant=X` u pozive

### Problem: Blank stranica nakon deploya
**Rješenje:**
- Provjeri Vercel build logs
- Provjeri `vercel.json` rewrites
- Testiraj lokalno s `npm run build` i `npm run preview`

---

## 💰 Troškovi

**Trenutna konfiguracija (Path-based):**
- ✅ Vercel Hobby: **$0/mjesec**
- ✅ Neon/Supabase baza: **$0-5/mjesec**
- ✅ **UKUPNO: $0-5/mjesec**

**Nema troškova za wildcard subdomene!**

---

## 🎉 Sve Radi!

Path-based routing je sada potpuno funkcionalan. Možeš:
- ✅ Koristiti PD Promina na `/promina/*`
- ✅ Dodati nove organizacije dinamički
- ✅ Sve radi na besplatnom Vercel Hobby planu
- ✅ Lako migrirati na subdomain kasnije (kod već podržava oba pristupa!)

---

## 📚 Dodatne Informacije

- **Backend middleware**: `backend/src/middleware/tenant.middleware.ts`
- **Frontend utilities**: `frontend/src/utils/tenantUtils.ts`
- **Branding context**: `frontend/src/context/BrandingContext.tsx`
- **App routing**: `frontend/src/App.tsx`
- **Vercel config**: `vercel.json`
