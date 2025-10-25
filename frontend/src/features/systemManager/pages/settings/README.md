# System Settings Refactoring

## 📁 Nova Struktura

```
settings/
├── SystemManagerSettings.tsx              (STARI - 1306 linija)
├── SystemManagerSettingsRefactored.tsx    (NOVI - ~120 linija)
├── GlobalSystemManagerSettings.tsx        (Ostaje isti)
├── components/
│   └── CollapsibleSection.tsx             (Reusable collapsible wrapper)
├── sections/
│   ├── index.ts                           (Export all sections)
│   ├── BasicSettingsSection.tsx           (Card Number, Renewal, Time Zone, Password Gen)
│   ├── ActivityRecognitionSection.tsx     (Postotci za uloge - NOVO)
│   └── ChangePasswordSection.tsx          (Username & Password)
└── hooks/
    └── useSystemSettings.ts               (Shared state & API logic)
```

## ✅ Što Je Implementirano

### 1. **CollapsibleSection Component**
- Reusable component za collapsible sekcije
- Samo "Change Password" otvorena po defaultu
- Smooth animations

### 2. **useSystemSettings Hook**
- Centralizirani state management
- API pozivi (getSystemSettings, updateSystemSettings)
- Partial update support (savePartialSettings)
- Error handling
- Success messages

### 3. **BasicSettingsSection**
- Card Number Length
- Renewal Start Month/Day
- Membership Termination Month/Day
- Time Zone
- Password Generation Strategy
- Password Separator
- Password Card Digits
- **Vlastiti Save button**

### 4. **ActivityRecognitionSection** (NOVO)
- Konfigurirajući postotci za uloge:
  - Vodič (100%)
  - Pomoćni vodič (50%)
  - Vozač (100%)
  - Sudionik (10%)
- Vizualni prikaz postotaka
- **Vlastiti Save button**

### 5. **ChangePasswordSection**
- Change Username
- Change Password
- **Otvorena po defaultu**
- Vlastiti form i validacija

## 🔄 Kako Zamijeniti Stari Kod

### Korak 1: Ažuriraj Import u SystemManagerDashboard.tsx

**PRIJE:**
```tsx
import SystemManagerSettings from '../settings/SystemManagerSettings';
```

**POSLIJE:**
```tsx
import SystemManagerSettings from '../settings/SystemManagerSettingsRefactored';
```

### Korak 2: Testiraj

1. Otvori System Manager Dashboard
2. Klikni na "Settings" tab
3. Provjeri:
   - ✅ Sve sekcije su zatvorene osim "Change Password"
   - ✅ Svaka sekcija ima svoj Save button
   - ✅ Collapsible sekcije rade
   - ✅ Spremanje radi

### Korak 3: Kad Sve Radi, Obriši Stari Kod

```bash
# Preimenuj stari file u backup
mv SystemManagerSettings.tsx SystemManagerSettings.OLD.tsx

# Preimenuj novi file
mv SystemManagerSettingsRefactored.tsx SystemManagerSettings.tsx
```

## 🚀 Dodavanje Novih Sekcija

### Primjer: Security Settings Section

1. **Kreiraj novu sekciju:**
```tsx
// sections/SecuritySettingsSection.tsx
import React from 'react';
import { Save } from 'lucide-react';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { LocalSystemSettings } from '../hooks/useSystemSettings';

interface SecuritySettingsSectionProps {
  settings: LocalSystemSettings;
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
  onUpdate: (updates: Partial<LocalSystemSettings>) => void;
  onSave: () => Promise<void>;
}

export const SecuritySettingsSection: React.FC<SecuritySettingsSectionProps> = ({
  settings,
  isLoading,
  error,
  successMessage,
  onUpdate,
  onSave
}) => {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave();
  };

  return (
    <CollapsibleSection title="Security Settings" defaultOpen={false}>
      <form onSubmit={handleSubmit} className="space-y-6 mt-4">
        {/* 2FA Settings */}
        <div className="flex items-center justify-between">
          <label className="block text-gray-700 text-sm font-bold">
            Enable 2FA globally
          </label>
          <input
            type="checkbox"
            checked={settings.twoFactorGlobalEnabled}
            onChange={(e) => onUpdate({ twoFactorGlobalEnabled: e.target.checked })}
            className="h-4 w-4"
          />
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isLoading ? 'Saving...' : 'Save Security Settings'}
        </button>
      </form>
    </CollapsibleSection>
  );
};
```

2. **Dodaj u index.ts:**
```tsx
export { SecuritySettingsSection } from './SecuritySettingsSection';
```

3. **Dodaj u SystemManagerSettings.tsx:**
```tsx
import { SecuritySettingsSection } from './sections';

// U komponenti:
<SecuritySettingsSection
  settings={settings}
  isLoading={isLoading}
  error={error}
  successMessage={successMessage}
  onUpdate={updateLocalSettings}
  onSave={handleSaveSecuritySettings}
/>
```

## 📝 ESLint Pravila

- ✅ Sve async funkcije koriste `void` gdje je potrebno
- ✅ Nema nekorištenih varijabli
- ✅ Pravilni TypeScript tipovi
- ✅ Dependency arrays u useEffect

## 🎯 Prednosti Nove Strukture

1. **Modularnost** - Svaka sekcija je zasebna komponenta
2. **Maintainability** - Lakše održavanje i debugging
3. **Reusability** - CollapsibleSection se može koristiti svugdje
4. **Performance** - Samo otvorene sekcije renderiraju sadržaj
5. **UX** - Jasnije što se sprema (svaka sekcija svoj button)
6. **Scalability** - Lako dodati nove sekcije

## ⚠️ Napomene

- **Activity Recognition Rates** trenutno nisu u bazi - potrebno dodati backend support
- **Global System Manager** koristi svoj zasebni Settings (GlobalSystemManagerSettings.tsx)
- **Service Worker** cache verzija povećana na v2 (fix za NS_ERROR_CORRUPTED_CONTENT)
