# PWA Multi-Tenant Implementation

## ✅ Implementirano!

Svaki tenant sada ima **vlastiti PWA (Progressive Web App)** s vlastitim brandingom, ikonomaikon i bojama.

---

## 📋 Što je Implementirano

### 1. **Backend: Dinamički Manifest Endpoint**
```
GET /api/manifest?tenant=promina
```

**Datoteke:**
- `backend/src/controllers/pwa.controller.ts` - Dinamička generacija manifesta
- `backend/src/routes/pwa.routes.ts` - PWA rute
- `backend/src/app.ts` - Registracija ruta

**Manifest struktura:**
```json
{
  "name": "Planinarsko društvo Promina",
  "short_name": "Promina",
  "description": "Aplikacija za članove...",
  "start_url": "/promina/login",
  "scope": "/promina/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#dc2626",
  "icons": [
    {
      "src": "/uploads/promina-logo.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

### 2. **Frontend: Dinamički Manifest Link**

**Datoteke:**
- `frontend/src/utils/pwaUtils.ts` - PWA utility funkcije
- `frontend/src/context/BrandingContext.tsx` - Integracija s branding kontekstom

**Funkcionalnosti:**
```typescript
updateManifestLink()      // Dodaje <link rel="manifest">
updateThemeColor(color)   // Postavlja theme-color
updatePageMeta(orgName)   // Postavlja title i description
```

**Dinamički `<link>` tag:**
```html
<link rel="manifest" href="/api/manifest?tenant=promina">
<meta name="theme-color" content="#dc2626">
<title>Planinarsko društvo Promina</title>
```

---

### 3. **Service Worker**

**Datoteka:**
- `frontend/public/service-worker.js`

**Funkcionalnosti:**
- ✅ Offline pristup
- ✅ Cache-iranje statičkih resursa
- ✅ Dinamičko cache-iranje
- ✅ Multi-tenant scope podržan

---

### 4. **Fallback Ikone**

**Lokacija:**
```
frontend/public/pwa/icons/
├── icon-192x192.png  ← Fallback ako tenant nema logo
├── icon-512x512.png  ← Fallback ako tenant nema logo
└── ... (ostale veličine)
```

**Logika:**
```
Ako tenant ima logo_path → koristi org logo
Inače → koristi fallback ikone iz /pwa/icons/
```

---

## 🎯 Kako Radi?

### Path-Based Multi-Tenancy

#### **PD Promina:**
```
URL: https://managemembers.vercel.app/promina/login
Manifest: https://managemembers.vercel.app/api/manifest?tenant=promina
Scope: /promina/
```

#### **PD Velebit:**
```
URL: https://managemembers.vercel.app/velebit/login
Manifest: https://managemembers.vercel.app/api/manifest?tenant=velebit
Scope: /velebit/
```

---

## 🔧 Org-Specific PWA Postavke

Svaka organizacija u bazi ima PWA polja:

```typescript
// Prisma schema (organizations table)
pwa_name              String?   // "PD Promina"
pwa_short_name        String?   // "Promina"
pwa_theme_color       String?   // "#dc2626"
pwa_background_color  String?   // "#ffffff"
pwa_icon_192_url      String?   // Custom 192x192 ikona URL
pwa_icon_512_url      String?   // Custom 512x512 ikona URL
```

**Postavljanje u GSM:**
1. Login kao Global System Manager
2. Organizations → Edit Organization
3. PWA sekcija → Postavi custom ikone i boje

---

## 📱 Instalacija PWA-a (User Experience)

### Desktop (Chrome/Edge):
1. Otvori `https://managemembers.vercel.app/promina/login`
2. Adresna traka → Ikona "Install" ⊕
3. Klikni "Install"
4. PWA se otvara kao samostalna aplikacija

### Mobile (Android/iOS):
1. Otvori u browseru
2. Menu (⋮) → "Add to Home Screen"
3. Ikona se pojavi na home screenu
4. Otvori kao app (bez browser UI-a)

---

## 🚀 Testiranje Lokalno

### 1. Pokreni Backend i Frontend
```bash
# Backend
cd backend
npm run dev

# Frontend
cd frontend
npm run dev
```

### 2. Testiraj Manifest Endpoint
```bash
# PD Promina
curl http://localhost:3000/api/manifest?tenant=promina

# PD Velebit
curl http://localhost:3000/api/manifest?tenant=velebit
```

**Očekivani response:**
```json
{
  "name": "Planinarsko društvo Promina",
  "short_name": "Promina",
  "start_url": "/promina/login",
  "scope": "/promina/",
  "theme_color": "#dc2626",
  ...
}
```

### 3. Provjeri u Browseru
```
http://localhost:5173/promina/login
```

**DevTools → Application → Manifest:**
- ✅ Manifest URL: `/api/manifest?tenant=promina`
- ✅ Icons: Fallback ili org logo
- ✅ Start URL: `/promina/login`
- ✅ Scope: `/promina/`

**DevTools → Application → Service Workers:**
- ✅ Status: Activated
- ✅ Scope: `/promina/`

---

## 🎨 Branding Prilagodba

### Theme Color (Status Bar)
Postavlja se automatski iz `org.primary_color`:
```html
<meta name="theme-color" content="#dc2626">
```

### Ikone
**Prioritet:**
1. `org.pwa_icon_512_url` (custom PWA ikona)
2. `org.logo_path` (org logo)
3. `/pwa/icons/icon-512x512.png` (fallback)

### Boje
- `theme_color` → `org.pwa_theme_color` ili `org.primary_color`
- `background_color` → `org.pwa_background_color` ili `#ffffff`

---

## 📊 Cache Strategy

**Service Worker koristi "Cache First" strategiju:**

1. **Static Assets** (immediate cache):
   - `/index.html`
   - `/manifest.json`
   - PWA ikone

2. **Dynamic Content** (runtime cache):
   - API responses
   - Images
   - JS/CSS bundles

3. **Network First** (za API pozive):
   - Pokušaj network
   - Fallback na cache ako offline

---

## 🐛 Troubleshooting

### Problem: Manifest se ne učitava
**Rješenje:**
```javascript
// Provjeri browser konzolu
[PWA] Manifest updated for org: promina

// Provjeri Network tab
GET /api/manifest?tenant=promina → 200 OK
```

### Problem: Service Worker nije registriran
**Rješenje:**
1. Provjeri je li HTTPS (ili localhost)
2. Provjeri browser konzolu
3. DevTools → Application → Service Workers

### Problem: Stare ikone se prikazuju
**Rješenje:**
1. Clear browser cache
2. Unregister Service Worker
3. Hard refresh (Ctrl+Shift+R)

### Problem: PWA se ne može instalirati
**Rješenje:**
1. Provjeri da manifest ima sve obavezna polja
2. Provjeri da ima minimum 2 ikone (192x192 i 512x512)
3. Provjeri `start_url` i `scope`

---

## ✅ Produkcija (Vercel)

Na produkciji, PWA automatski radi za sve tenant-e:

```
✅ https://managemembers.vercel.app/promina/login
   → Manifest: /api/manifest?tenant=promina
   → Scope: /promina/

✅ https://managemembers.vercel.app/velebit/login
   → Manifest: /api/manifest?tenant=velebit
   → Scope: /velebit/
```

**Svaki tenant ima:**
- ✅ Vlastiti manifest
- ✅ Vlastite ikone (ili fallback)
- ✅ Vlastite boje
- ✅ Vlastiti start URL i scope
- ✅ Offline pristup kroz Service Worker

---

## 🎉 Sve Radi!

PWA implementacija je potpuno funkcionalna za multi-tenant arhitekturu:

- ✅ Dinamički manifest po tenant-u
- ✅ Fallback ikone ako tenant nema logo
- ✅ Theme color prilagodba
- ✅ Service Worker za offline pristup
- ✅ Instalacija na desktop i mobile
- ✅ Path-based scopes za svaki tenant

---

## 📚 Reference

- **Backend Controller**: `backend/src/controllers/pwa.controller.ts`
- **Backend Routes**: `backend/src/routes/pwa.routes.ts`
- **Frontend Utils**: `frontend/src/utils/pwaUtils.ts`
- **Service Worker**: `frontend/public/service-worker.js`
- **Fallback Icons**: `frontend/public/pwa/icons/`
