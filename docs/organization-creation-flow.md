# Organization Creation Flow - Detaljni Plan

**Datum:** 2025-10-04  
**Autor:** Cascade AI  
**Status:** ✅ IMPLEMENTIRANO

---

## 🎯 CILJ

Omogućiti **globalnom System Manager-u** (`organization_id = null`) da kreira nove organizacije s potpunom konfiguracijom.

---

## 👥 ENTITETI I PRISTUPNA PRAVA

### **1. GLOBALNI SYSTEM MANAGER**
- **organization_id:** `null`
- **Može:**
  - ✅ Kreirati nove organizacije
  - ✅ Vidjeti sve organizacije
  - ✅ Ažurirati bilo koju organizaciju
  - ✅ Obrisati organizaciju
  - ✅ Kreirati org-specific System Manager-e

### **2. ORG-SPECIFIC SYSTEM MANAGER**
- **organization_id:** `1`, `2`, `3`, ...
- **Može:**
  - ✅ Vidjeti samo svoju organizaciju
  - ✅ Ažurirati svoju organizaciju (branding, postavke)
  - ❌ **NE MOŽE** kreirati nove organizacije
  - ❌ **NE MOŽE** vidjeti druge organizacije

### **3. MEMBER (SUPERUSER)**
- **organization_id:** `1`, `2`, `3`, ...
- **Može:**
  - ✅ Upravljati članovima svoje organizacije
  - ✅ Kreirati aktivnosti, vještine za svoju organizaciju
  - ❌ **NE MOŽE** pristupiti Organization Management-u
  - ❌ **NE MOŽE** vidjeti System Manager sučelje

---

## 🔐 AUTORIZACIJA

### Backend Middleware
```typescript
// backend/src/middleware/systemManager.middleware.ts

export const requireGlobalSystemManager = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Provjeri da je korisnik System Manager
  if (!req.user || req.user.type !== 'system_manager') {
    return res.status(403).json({ 
      error: 'Access denied. System Manager required.' 
    });
  }

  // Provjeri da je GLOBALNI System Manager
  if (req.user.organization_id !== null) {
    return res.status(403).json({ 
      error: 'Access denied. Global System Manager required.' 
    });
  }

  next();
};

export const requireSystemManager = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Provjeri da je korisnik System Manager (bilo koji)
  if (!req.user || req.user.type !== 'system_manager') {
    return res.status(403).json({ 
      error: 'Access denied. System Manager required.' 
    });
  }

  next();
};
```

### Route Protection
```typescript
// backend/src/routes/systemManager.routes.ts

router.post(
  '/organizations', 
  authenticateSystemManager,
  requireGlobalSystemManager,  // ← SAMO globalni SM
  createOrganization
);

router.get(
  '/organizations', 
  authenticateSystemManager,
  requireGlobalSystemManager,  // ← SAMO globalni SM
  getAllOrganizations
);

router.put(
  '/organizations/:id', 
  authenticateSystemManager,
  requireSystemManager,  // ← Bilo koji SM (ali s dodatnom provjerom)
  updateOrganization
);
```

---

## 📝 ORGANIZATION CREATION FLOW

### **Korak 1: Osnovne Informacije**

**UI Forma:**
```typescript
interface OrganizationBasicInfo {
  name: string;              // "PD Velebit"
  short_name: string;        // "Velebit"
  subdomain: string;         // "velebit" (unique!)
  email: string;             // "info@velebit.hr"
  phone?: string;            // "+385 23 123 456"
  website_url?: string;      // "https://velebit.hr"
}
```

**Validacija:**
- ✅ Subdomen mora biti unique
- ✅ Subdomen format: `^[a-z0-9-]+$` (lowercase, brojevi, crtice)
- ✅ Email format validacija
- ✅ Provjera dostupnosti subdomene

**Backend Endpoint:**
```typescript
POST /api/system-manager/organizations/check-subdomain
Body: { subdomain: "velebit" }
Response: { available: true }
```

---

### **Korak 2: Branding**

**UI Forma:**
```typescript
interface OrganizationBranding {
  logo_file?: File;          // Upload (512x512 PNG)
  primary_color: string;     // "#dc2626" (hex color picker)
  secondary_color: string;   // "#991b1b"
}
```

**Logo Upload:**
- ✅ Max veličina: 2MB
- ✅ Format: PNG, JPG
- ✅ Dimenzije: 512x512 (preporučeno)
- ✅ Automatsko resizing na server-u

**Storage:**
```
backend/uploads/organization-logos/
├── velebit-logo.png
├── promina-logo.png
└── dinara-logo.png
```

---

### **Korak 3: Dokumenti (Opciono)**

**UI Forma:**
```typescript
interface OrganizationDocuments {
  ethics_code_url?: string;       // URL do etičkog kodeksa
  privacy_policy_url?: string;    // URL do privacy policy
  membership_rules_url?: string;  // URL do pravila članstva
}
```

---

### **Korak 4: System Manager za Novu Organizaciju**

**UI Forma:**
```typescript
interface OrgSystemManagerData {
  username: string;        // "velebit_admin"
  email: string;           // "admin@velebit.hr"
  display_name: string;    // "Velebit Administrator"
  password: string;        // Min 8 znakova
  confirm_password: string;
}
```

**Validacija:**
- ✅ Username unique unutar organizacije
- ✅ Email unique unutar organizacije
- ✅ Password strength (min 8 znakova, uppercase, lowercase, broj)

---

### **Korak 5: Pregled i Potvrda**

**UI:**
```
┌─────────────────────────────────────────┐
│ Pregled Nove Organizacije               │
├─────────────────────────────────────────┤
│ Naziv: PD Velebit                       │
│ Subdomen: velebit.platforma.hr          │
│ Email: info@velebit.hr                  │
│ Logo: [preview]                         │
│ Boje: [color swatches]                  │
│                                         │
│ System Manager:                         │
│ - Username: velebit_admin               │
│ - Email: admin@velebit.hr               │
│                                         │
│ [Natrag] [Kreiraj Organizaciju]        │
└─────────────────────────────────────────┘
```

---

## 🔧 BACKEND IMPLEMENTACIJA

### **POST /api/system-manager/organizations**

```typescript
export const createOrganization = async (req: Request, res: Response) => {
  // 1. Autorizacija - samo globalni SM
  if (req.user.organization_id !== null) {
    return res.status(403).json({ error: 'Global System Manager required' });
  }

  const {
    // Organization data
    name,
    short_name,
    subdomain,
    email,
    phone,
    website_url,
    primary_color,
    secondary_color,
    ethics_code_url,
    privacy_policy_url,
    membership_rules_url,
    
    // System Manager data
    sm_username,
    sm_email,
    sm_display_name,
    sm_password
  } = req.body;

  // 2. Validacija
  const existingOrg = await prisma.organization.findUnique({
    where: { subdomain }
  });
  if (existingOrg) {
    return res.status(400).json({ error: 'Subdomain already exists' });
  }

  // 3. Transakcija - sve ili ništa
  const result = await prisma.$transaction(async (tx) => {
    // 3a. Kreiraj organizaciju
    const organization = await tx.organization.create({
      data: {
        name,
        short_name,
        subdomain,
        email,
        phone,
        website_url,
        primary_color,
        secondary_color,
        ethics_code_url,
        privacy_policy_url,
        membership_rules_url,
        logo_path: null, // Upload kasnije
        is_active: true
      }
    });

    // 3b. Kreiraj System Manager za novu organizaciju
    const hashedPassword = await bcrypt.hash(sm_password, 10);
    const systemManager = await tx.systemManager.create({
      data: {
        organization_id: organization.id,
        username: sm_username,
        email: sm_email,
        display_name: sm_display_name,
        password_hash: hashedPassword
      }
    });

    // 3c. Seed inicijalne podatke
    await seedActivityTypes(tx, organization.id);
    await seedSkills(tx, organization.id);
    await seedSystemSettings(tx, organization.id);

    return { organization, systemManager };
  });

  // 4. Logo upload (izvan transakcije)
  if (req.file) {
    const logoPath = await uploadOrganizationLogo(req.file, result.organization.id);
    await prisma.organization.update({
      where: { id: result.organization.id },
      data: { logo_path: logoPath }
    });
  }

  // 5. Audit log
  await auditService.logAction(
    'CREATE_ORGANIZATION',
    req.user.id,
    `Created organization: ${name}`,
    req,
    'success'
  );

  res.status(201).json({
    success: true,
    organization: result.organization,
    message: `Organization ${name} created successfully`
  });
};
```

---

## 🌱 SEED FUNKCIJE ZA NOVU ORGANIZACIJU

### **1. Activity Types**
```typescript
async function seedActivityTypes(tx: TransactionClient, organizationId: number) {
  const defaultTypes = [
    { key: 'izleti', name: 'Izleti', description: 'Planinarski izleti' },
    { key: 'akcije', name: 'Akcije', description: 'Radne akcije' },
    { key: 'tecajevi', name: 'Tečajevi', description: 'Edukacijski tečajevi' },
    { key: 'dezurstva', name: 'Dežurstva', description: 'Dežurstva u domu' },
    { key: 'ostalo', name: 'Ostalo', description: 'Ostale aktivnosti' }
  ];

  for (const type of defaultTypes) {
    await tx.activityType.create({
      data: {
        organization_id: organizationId,
        key: type.key,
        name: type.name,
        description: type.description
      }
    });
  }
}
```

### **2. Skills**
```typescript
async function seedSkills(tx: TransactionClient, organizationId: number) {
  const defaultSkills = [
    { key: 'first_aid', name: 'Prva pomoć' },
    { key: 'navigation', name: 'Orijentacija' },
    { key: 'climbing', name: 'Penjanje' },
    { key: 'skiing', name: 'Skijanje' },
    // ... ostale vještine
  ];

  for (const skill of defaultSkills) {
    await tx.skill.create({
      data: {
        organization_id: organizationId,
        key: skill.key,
        name: skill.name
      }
    });
  }
}
```

### **3. System Settings**
```typescript
async function seedSystemSettings(tx: TransactionClient, organizationId: number) {
  await tx.systemSettings.create({
    data: {
      organization_id: organizationId,
      renewalStartDay: 31,
      renewalStartMonth: 10,
      membershipFeeAmount: 100,
      // ... ostale postavke
    }
  });
}
```

---

## 🎨 FRONTEND WIZARD KOMPONENTA

### **OrganizationCreationWizard.tsx**
```typescript
const steps = [
  { id: 1, title: 'Osnovne Informacije', component: BasicInfoStep },
  { id: 2, title: 'Branding', component: BrandingStep },
  { id: 3, title: 'Dokumenti', component: DocumentsStep },
  { id: 4, title: 'System Manager', component: SystemManagerStep },
  { id: 5, title: 'Pregled', component: ReviewStep }
];

const [currentStep, setCurrentStep] = useState(1);
const [formData, setFormData] = useState<OrganizationFormData>({});

const handleNext = () => {
  if (validateStep(currentStep)) {
    setCurrentStep(prev => prev + 1);
  }
};

const handleSubmit = async () => {
  const response = await api.post('/system-manager/organizations', formData);
  if (response.success) {
    navigate('/system-manager/organizations');
    toast.success('Organizacija uspješno kreirana!');
  }
};
```

---

## ✅ REZULTAT KREIRANJA

Nakon uspješnog kreiranja:

1. ✅ **Nova organizacija** u bazi
2. ✅ **System Manager** za tu organizaciju
3. ✅ **Activity Types** (5 default tipova)
4. ✅ **Skills** (10+ default vještina)
5. ✅ **System Settings** (default postavke)
6. ✅ **Logo** uploadan (ako je dodan)
7. ✅ **Subdomen** spreman: `velebit.platforma.hr`

**Org-specific System Manager** se može odmah ulogirati:
```
URL: https://velebit.platforma.hr/system-manager/login
Username: velebit_admin
Password: [unesena lozinka]
```

---

## ✅ IMPLEMENTIRANO (2025-10-04)

### Backend
1. ✅ **Middleware** - `backend/src/middleware/systemManager.middleware.ts`
   - `requireGlobalSystemManager` - Autorizacija za globalne SM
   - `requireOrganizationAccess` - Provjera pristupa organizaciji
   
2. ✅ **Controller** - `backend/src/controllers/organization.controller.ts`
   - `checkSubdomainAvailability` - Provjera subdomene
   - `createOrganization` - Kreiranje org + SM + seed
   - `getAllOrganizations` - Lista organizacija
   - `getOrganizationById` - Detalji organizacije
   - `updateOrganization` - Ažuriranje
   - `deleteOrganization` - Brisanje
   - Seed funkcije: `seedActivityTypes`, `seedSkills`, `seedSystemSettings`

3. ✅ **Routes** - `backend/src/routes/organization.routes.ts`
   - Integrirano u `/api/system-manager/organizations`

### Frontend
1. ✅ **API Utility** - `frontend/src/utils/api/apiOrganizations.ts`
   - Sve CRUD funkcije s TypeScript tipovima

2. ✅ **Organization List** - `frontend/src/features/systemManager/organizations/OrganizationList.tsx`
   - Grid prikaz organizacija
   - Stats (members, activities)
   - Edit/Delete akcije

3. ✅ **Creation Wizard** - `frontend/src/features/systemManager/organizations/OrganizationWizard.tsx`
   - 4-step wizard s progress indicator
   - Validacija po koracima
   - Async subdomain provjera

4. ✅ **Wizard Steps:**
   - `BasicInfoStep.tsx` - Osnovne informacije
   - `BrandingStep.tsx` - Boje i dokumenti
   - `SystemManagerStep.tsx` - SM account kreiranje
   - `ReviewStep.tsx` - Pregled prije kreiranja

5. ✅ **Routing** - Integrirano u `SystemManagerRoutes.tsx`

### API Endpoints
```
GET    /api/system-manager/organizations/check-subdomain?subdomain=velebit
POST   /api/system-manager/organizations
GET    /api/system-manager/organizations
GET    /api/system-manager/organizations/:id
PUT    /api/system-manager/organizations/:id
DELETE /api/system-manager/organizations/:id
```

---

## 🚀 SLJEDEĆI KORACI

1. **Logo Upload** - Dodati POST /organizations/:id/logo endpoint
2. **Organization Edit Page** - Forma za ažuriranje postojeće org
3. **Testing** - E2E testiranje cijelog flow-a
4. **Wildcard DNS** - Setup za *.platforma.hr
5. **SSL Certifikati** - Wildcard SSL za sve subdomene

---

**Zadnje ažurirano:** 2025-10-04 17:40  
**Status:** ✅ Implementirano - Spremno za testiranje
