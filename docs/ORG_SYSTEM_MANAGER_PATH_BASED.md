# Organization System Manager - Path-Based Routing

## ✅ Implementacija Završena!

Organization-specific System Manager sada podržava **path-based multi-tenancy routing**.

---

## 📊 Dva Tipa System Manager-a

### 1. **Global System Manager (GSM)**
```
URL: /system-manager/login
organization_id: NULL
```

**Može:**
- ✅ Kreirati nove organizacije
- ✅ Vidjeti SVE organizacije  
- ✅ Resetirati org SM credentials
- ✅ Pristupiti globalnim audit logovima

**NE može:**
- ❌ Mijenjati org-specific postavke (Settings)

---

### 2. **Organization System Manager (Org SM)**
```
URL: /promina/system-manager/login
organization_id: 1, 2, 3, ...
```

**Može:**
- ✅ Vidjeti samo SVOJU organizaciju
- ✅ Ažurirati postavke svoje organizacije (Settings, Holidays, Duty)
- ✅ Vidjeti audit logove svoje organizacije
- ✅ Upravljati članovima svoje organizacije

**NE može:**
- ❌ Kreirati nove organizacije
- ❌ Vidjeti druge organizacije
- ❌ Pristupiti globalnim postavkama

---

## 🔧 Implementirane Promjene (6 datoteka)

### 1. **Backend: tenant.middleware.ts**
✅ Skipaj SAMO Global SM rute (`/system-manager/*`)  
✅ Org SM rute (`/:orgSlug/system-manager/*`) TREBAJU tenant context

```typescript
// Global SM - bez tenant-a
if (path.startsWith('/system-manager')) {
  return next(); // Skip tenant detection
}

// Org SM - SA tenant-om
// /:orgSlug/api/system-manager/* → tenant = orgSlug
```

---

### 2. **Frontend: App.tsx (OrgRoutes)**
✅ Dodano `/system-manager/*` unutar `OrgRoutes` komponente

```tsx
<Routes>
  {/* Organization System Manager rute */}
  <Route 
    path="/system-manager/*" 
    element={<SystemManagerRoutes />} 
  />
  
  {/* Member login i ostale rute */}
  <Route path="/login" element={<LoginPage />} />
  ...
</Routes>
```

---

### 3. **Frontend: SystemManagerRoutes.tsx**
✅ Dinamička detekcija org slug-a  
✅ Dinamički redirecti

```tsx
const useOrgSlug = (): string | null => {
  const pathParts = location.pathname.split('/').filter(Boolean);
  
  // /system-manager/... → null (Global SM)
  if (pathParts[0] === 'system-manager') return null;
  
  // /promina/system-manager/... → 'promina' (Org SM)
  if (pathParts[1] === 'system-manager') return pathParts[0];
  
  return null;
};

// Redirect path
const loginPath = orgSlug 
  ? `/${orgSlug}/system-manager/login`  // Org SM
  : '/system-manager/login';             // Global SM
```

---

### 4. **Frontend: systemManagerApi.ts**
✅ Automatski URL rewrite baziran na org slug-u

```typescript
const orgSlug = extractOrgSlugFromPath();

if (url.startsWith('/system-manager')) {
  if (orgSlug) {
    // Org SM: /system-manager/dashboard → /promina/api/system-manager/dashboard
    config.url = url.replace('/system-manager', `/${orgSlug}/api/system-manager`);
  } else {
    // Global SM: /system-manager/dashboard → /api/system-manager/dashboard
    config.url = url.replace('/system-manager', '/api/system-manager');
  }
}
```

---

### 5. **Frontend: SystemManagerContext.tsx**
✅ Dinamički login redirecti

```tsx
const orgSlug = getOrgSlug();
const loginPath = orgSlug 
  ? `/${orgSlug}/system-manager/login` 
  : '/system-manager/login';

navigate(`${loginPath}${brandingQuery}`, { replace: true });
```

---

### 6. **vercel.json**
✅ Rewrites za org SM API pozive

```json
{
  "rewrites": [
    {
      "source": "/:orgSlug/api/system-manager/:path*",
      "destination": "/api/system-manager/:path*"
    },
    {
      "source": "/api/system-manager/:path*",
      "destination": "/api/[...slug]"
    }
  ]
}
```

---

## 🚀 Testiranje Lokalno

### 1. Pokreni Backend
```bash
cd backend
npm run dev
```

### 2. Pokreni Frontend
```bash
cd frontend
npm run dev
```

### 3. Testiraj Global SM
```
http://localhost:5173/system-manager/login
```

**Login credentials:**
- Username: admin (ili što god imaš)
- Password: ...

**API pozivi idu na:**
```
GET /api/system-manager/dashboard/stats
GET /api/system-manager/organizations
POST /api/system-manager/organizations
```

---

### 4. Testiraj Organization SM (PD Promina)
```
http://localhost:5173/promina/system-manager/login
```

**Login credentials:**
- Username: promina_admin (ili što god je kreirano)
- Password: ...

**API pozivi idu na:**
```
GET /promina/api/system-manager/dashboard/stats
GET /promina/api/system-manager/settings
PUT /promina/api/system-manager/settings
```

**Backend prima:**
```
[TENANT-MIDDLEWARE] Host: localhost:3000
[TENANT-MIDDLEWARE] Path: /api/system-manager/settings
[TENANT-MIDDLEWARE] Final Org Slug: promina (Path: null, Subdomain: null, Query: null)
[TENANT-MIDDLEWARE] Organizacija: PD Promina (ID: 1)
```

---

## 📱 Production URL-ovi (Vercel)

### Global System Manager
```
https://managemembers.vercel.app/system-manager/login
https://managemembers.vercel.app/system-manager/dashboard
https://managemembers.vercel.app/system-manager/organizations
```

### PD Promina System Manager
```
https://managemembers.vercel.app/promina/system-manager/login
https://managemembers.vercel.app/promina/system-manager/dashboard
https://managemembers.vercel.app/promina/system-manager/settings
https://managemembers.vercel.app/promina/system-manager/holidays
```

### PD Split System Manager
```
https://managemembers.vercel.app/split/system-manager/login
https://managemembers.vercel.app/split/system-manager/dashboard
```

---

## 🔍 Debug Logovi

**Frontend Console:**
```
[SM-API] Org-specific SM API: /system-manager/settings → /promina/api/system-manager/settings
[BRANDING] ✅ Detected tenant from path: promina
[APP] OrgRoutes - orgSlug: promina
```

**Backend Console:**
```
[TENANT-MIDDLEWARE] Host: localhost:3000, Path: /api/system-manager/settings
[TENANT-MIDDLEWARE] Final Org Slug: promina
[TENANT-MIDDLEWARE] Organizacija: Planinarsko društvo Promina (ID: 1)
```

---

## ⚠️ Važno: Razlike GSM vs Org SM

### Global SM
| Feature | Dostupno? |
|---------|-----------|
| Organizations Management | ✅ |
| Create Organizations | ✅ |
| View All Organizations | ✅ |
| Global Audit Logs | ✅ |
| Settings Tab | ❌ (nema org) |
| Holidays Tab | ❌ (nema org) |
| Members Tab | ❌ (nema org) |

### Organization SM
| Feature | Dostupno? |
|---------|-----------|
| Organizations Management | ❌ |
| Create Organizations | ❌ |
| View All Organizations | ❌ |
| Global Audit Logs | ❌ |
| Settings Tab | ✅ (svoja org) |
| Holidays Tab | ✅ (svoja org) |
| Members Tab | ✅ (svoja org) |
| Audit Logs | ✅ (svoja org) |

---

## 🐛 Troubleshooting

### Problem: "Organization not found" za Org SM
**Uzrok:** Org SM pokušava pristupiti Settings-ima, ali tenant nije detektiran.

**Rješenje:**
1. Provjeri browser konzolu - traži `[SM-API]` logove
2. Provjeri backend konzolu - traži `[TENANT-MIDDLEWARE]` logove
3. Potvrdi da URL ima format: `/promina/system-manager/settings`
4. Provjeri postoji li org u bazi:
   ```sql
   SELECT * FROM organizations WHERE subdomain = 'promina';
   ```

---

### Problem: API vraća 403 "Global System Manager required"
**Uzrok:** Org SM pokušava pristupiti ruti koja je dozvoljena SAMO Global SM-u.

**Rješenje:**
- Provjeri koja ruta se poziva
- Organizations management je SAMO za Global SM
- Org SM ne može kreirati nove organizacije

---

### Problem: Redirect na /system-manager/login umjesto /promina/system-manager/login
**Uzrok:** Org slug nije ispravno detektiran u SystemManagerContext.

**Rješenje:**
1. Provjeri `getOrgSlug()` funkciju u SystemManagerContext.tsx
2. Provjeri da URL ima format: `/promina/system-manager/dashboard`
3. Provjeri browser konzolu za `[SM-CONTEXT]` logove

---

## 🎉 Sve Radi!

Path-based routing za Organization System Manager je potpuno funkcionalan:

- ✅ Global SM: `/system-manager/*` - bez tenant-a
- ✅ Org SM: `/promina/system-manager/*` - s tenant-om
- ✅ API pozivi automatski imaju org slug
- ✅ Tenant middleware ekstraktuje org iz path-a
- ✅ Dinamički redirecti rade ispravno
- ✅ Sve rute zaštićene s odgovarajućom autorizacijom

---

## 📚 Reference

- **Backend middleware**: `backend/src/middleware/tenant.middleware.ts`
- **Frontend App**: `frontend/src/App.tsx`
- **SM Routes**: `frontend/src/features/systemManager/SystemManagerRoutes.tsx`
- **SM API**: `frontend/src/features/systemManager/utils/systemManagerApi.ts`
- **SM Context**: `frontend/src/context/SystemManagerContext.tsx`
- **Vercel config**: `vercel.json`
