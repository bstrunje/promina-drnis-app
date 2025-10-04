# 🏢 Tenant Middleware - Upute za Korištenje

## 📋 Pregled

Tenant middleware automatski identificira organizaciju na temelju subdomene i postavlja tenant context za sve API pozive. Ovo omogućava multi-tenant funkcionalnost bez potrebe za ručnim filtriranjem u svakom endpoint-u.

---

## 🔧 Kako Funkcionira

### **1. Subdomena → Organization ID Mapiranje**

| Subdomena | Host | Organization ID | Organizacija |
|-----------|------|-----------------|--------------|
| `promina` | `promina.localhost:3001` | 1 | PD Promina Drniš |
| `test` | `test.localhost:3001` | 2 | Test Organizacija |
| `promina-drnis` | `promina-drnis.vercel.app` | 1 | PD Promina Drniš |

### **2. Fallback Logika**
- Ako nema subdomene → koristi PD Promina (ID: 1)
- Ako subdomena ne postoji → koristi PD Promina (ID: 1)
- Ako nema organizacija → 503 Service Unavailable

---

## 🚀 Korištenje u Kodu

### **1. U Route Handler-ima**

```typescript
import { Request, Response } from 'express';
import { getOrganizationId, getOrganization } from '../utils/tenant.helper';

// Automatski - middleware postavlja req.organizationId
app.get('/api/members', tenantMiddleware, async (req: Request, res: Response) => {
  const organizationId = getOrganizationId(req); // Baca grešku ako nije dostupan
  
  // Svi upiti automatski filtrirani po organizaciji
  const members = await prisma.member.findMany({
    where: { organization_id: organizationId }
  });
  
  res.json(members);
});
```

### **2. U Repository-jima**

```typescript
import { createTenantWhere, createTenantData } from '../utils/tenant.helper';

export class MemberRepository {
  
  async findAll(req: Request) {
    const organizationId = getOrganizationId(req);
    
    return await prisma.member.findMany({
      where: createTenantWhere(organizationId, {
        status: 'registered'
      })
    });
  }
  
  async create(req: Request, memberData: any) {
    const organizationId = getOrganizationId(req);
    
    return await prisma.member.create({
      data: createTenantData(organizationId, memberData)
    });
  }
}
```

### **3. U Servisima**

```typescript
import { ensureTenantAccess } from '../utils/tenant.helper';

export class MemberService {
  
  async updateMember(req: Request, memberId: number, updateData: any) {
    const organizationId = getOrganizationId(req);
    
    // Dohvati postojeći zapis
    const existingMember = await prisma.member.findUnique({
      where: { member_id: memberId }
    });
    
    if (!existingMember) {
      throw new Error('Član nije pronađen');
    }
    
    // Provjeri da pripada trenutnoj organizaciji
    ensureTenantAccess(existingMember, organizationId, 'Član');
    
    // Ažuriraj
    return await prisma.member.update({
      where: { 
        member_id: memberId,
        organization_id: organizationId // Dodatna sigurnost
      },
      data: updateData
    });
  }
}
```

---

## 🛡️ Sigurnosne Provjere

### **1. Automatska Validacija**

```typescript
// ❌ LOŠE - može pristupiti podacima drugih organizacija
const member = await prisma.member.findUnique({
  where: { member_id: memberId }
});

// ✅ DOBRO - automatski filtrira po organizaciji
const member = await prisma.member.findUnique({
  where: { 
    member_id: memberId,
    organization_id: getOrganizationId(req)
  }
});
```

### **2. Utility Funkcije za Sigurnost**

```typescript
import { validateTenantAccess, ensureTenantAccess } from '../utils/tenant.helper';

// Provjeri da li zapis pripada organizaciji
if (!validateTenantAccess(member, organizationId)) {
  return res.status(403).json({ error: 'Nemate pristup ovom resursu' });
}

// Baci grešku ako ne pripada
ensureTenantAccess(member, organizationId, 'Član');
```

---

## 📡 Public API Endpoints

### **1. Organizacijske Informacije**

```bash
# Dohvati sve javne informacije o organizaciji
GET /api/org-config

# Dohvati samo branding informacije
GET /api/org-config/branding
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Planinarska družina Promina Drniš",
    "short_name": "PD Promina",
    "subdomain": "promina",
    "primary_color": "#0066cc",
    "secondary_color": "#1e40af",
    "logo_path": "promina-logo.png",
    "email": "info@pd-promina.hr",
    "website_url": "https://pd-promina.hr"
  }
}
```

---

## 🔧 Konfiguracija

### **1. Express App Setup**

```typescript
import { tenantMiddleware, requireTenant } from './middleware/tenant.middleware';
import orgConfigRoutes from './routes/org-config.routes';

// Public routes (bez authMiddleware)
app.use('/api', orgConfigRoutes);

// Protected routes s tenant middleware
app.use('/api/members', tenantMiddleware, authMiddleware, memberRoutes);
app.use('/api/activities', tenantMiddleware, authMiddleware, activityRoutes);
```

### **2. Middleware Redoslijed**

```typescript
// ✅ ISPRAVNO
app.use('/api/members', tenantMiddleware, authMiddleware, memberRoutes);

// ❌ POGREŠNO - authMiddleware prije tenant middleware
app.use('/api/members', authMiddleware, tenantMiddleware, memberRoutes);
```

---

## 🐛 Debugging

### **1. Console Logovi**

```
[TENANT-MIDDLEWARE] Host: promina.localhost:3001, Subdomain: promina
[TENANT-MIDDLEWARE] Organizacija: Planinarska družina Promina Drniš (ID: 1)
```

### **2. Cache Monitoring**

```typescript
import { clearOrganizationCache } from './middleware/tenant.middleware';

// Očisti cache za testiranje
clearOrganizationCache();
```

---

## 📊 Performance

### **1. Cache**
- Organizacije se cache-iraju u memoriji 5 minuta
- Sprječava česte DB pozive za istu subdomenu
- Automatsko čišćenje cache-a

### **2. Database Indexi**
- `organization_id` index na svim tablicama
- Composite indexi za optimalne performanse
- Foreign key constraints za integritet

---

## 🧪 Testiranje

### **1. Lokalni Development**

```bash
# Test s različitim subdomenama
curl http://promina.localhost:3001/api/org-config
curl http://test.localhost:3001/api/org-config

# Test bez subdomene (fallback)
curl http://localhost:3001/api/org-config
```

### **2. Unit Testovi**

```typescript
describe('Tenant Middleware', () => {
  it('should extract subdomain correctly', () => {
    const subdomain = extractSubdomain('promina.localhost:3001');
    expect(subdomain).toBe('promina');
  });
  
  it('should fallback to default organization', async () => {
    const req = { get: () => 'localhost:3001' };
    await tenantMiddleware(req, res, next);
    expect(req.organizationId).toBe(1);
  });
});
```

---

## ⚠️ Važne Napomene

1. **Uvijek koristiti tenant helper funkcije** umjesto direktnog pristupa `req.organizationId`
2. **Dodati organization_id u sve WHERE uvjete** za sigurnost
3. **Testirati s različitim subdomenama** prije produkcije
4. **Cache se automatski čisti** - nema potrebe za ručnim čišćenjem
5. **Fallback na PD Promina** omogućava development bez konfiguracije

---

**Zadnje ažurirano:** 2025-10-03  
**Autor:** Cascade AI
