# Modularni sustav za upravljanje članstvom

Ovaj modul implementira modulariziranu verziju komponenti za upravljanje članstvom, uključujući upravljanje članskim karticama, markicama i povijesti članstva.

## Struktura modula

```
src/features/membership/
├── components/             # UI komponente
│   ├── CardNumberSection.tsx         # Komponenta za upravljanje brojem kartice
│   ├── StampManagementSection.tsx    # Komponenta za upravljanje markicama
│   ├── MembershipPeriodsSection.tsx  # Komponenta za prikaz i upravljanje periodima članstva
│   ├── PeriodFormRow.tsx             # Pomoćna komponenta za redak u formi perioda
│   └── MembershipCardManagerModular.tsx  # Modularna verzija glavne komponente
├── hooks/                  # Prilagođeni hook-ovi za odvajanje logike
│   ├── useCardManagement.ts          # Hook za upravljanje karticama 
│   ├── useStampManagement.ts         # Hook za upravljanje markicama
│   └── useMembershipPeriods.ts       # Hook za upravljanje periodima članstva
├── types/                  # Definicije tipova
│   └── membershipTypes.ts            # Zajednički tipovi za komponente
├── MembershipCardManagerAdapter.tsx  # Adapter za glavnu komponentu kartice
├── MembershipHistoryAdapter.tsx      # Adapter za komponentu povijesti članstva
├── test/                   # Testne komponente
│   └── MembershipModuleTest.tsx      # Testna komponenta za usporedbu implementacija
└── index.tsx               # Glavni ulazni modul koji izlaže sve komponente
```

## Status implementacije

Uspješno je implementirana modularna arhitektura sa sljedećim karakteristikama:

1. **Izvorni kod** podijeljen je u manje, fokusirane cjeline:
   - UI komponente u `components/` direktoriju
   - Hook-ovi s poslovnom logikom u `hooks/` direktoriju
   - Tipovi u `types/` direktoriju

2. **Adapteri** omogućuju kompatibilnost sa starim kodom:
   - `MembershipCardManagerAdapter` povezuje se s originalnom komponentom
   - `MembershipHistoryAdapter` povezuje se s originalnom komponentom

3. **Postojeće komponente** sada koriste adaptere:
   - `frontend/components/MembershipCardManager.tsx`
   - `frontend/components/MembershipHistory.tsx`

## Kako koristiti

### Postojeće komponente (kompatibilnost)

Sve postojeće reference na originalne komponente automatski koriste modularnu arhitekturu kroz adaptere, tako da **nije potrebno mijenjati postojeći kod**.

```tsx
// Ova importi i dalje rade kao i prije
import MembershipCardManager from "@components/MembershipCardManager";
import MembershipHistory from "@components/MembershipHistory";
```

### Izravno korištenje modularnih komponenti (novi kod)

Za nove komponente, možete izravno koristiti modularne komponente:

```tsx
import { 
  MembershipManager, 
  MembershipCardManagerModular,
  MembershipPeriodsSection 
} from '@/features/membership';

// Kompletno rješenje
<MembershipManager
  member={member}
  onUpdate={handleMemberUpdate}
  userRole={userRole}
/>

// Ili pojedinačne komponente
<MembershipCardManagerModular
  member={member}
  onUpdate={handleMemberUpdate}
  userRole={userRole}
/>

<MembershipPeriodsSection
  member={member}
  periods={member.membership_history}
  feePaymentYear={member.membership_details?.fee_payment_year}
  feePaymentDate={member.membership_details?.fee_payment_date}
  onUpdatePeriods={handlePeriodsUpdate}
  onUpdate={handleMemberUpdate}
  userRole={userRole}
/>
```

## Prednosti modularnog pristupa

1. **Bolja organizacija koda** - Svaka komponenta ima jednu odgovornost
2. **Odvojena poslovna logika** - Hook-ovi izdvajaju logiku od UI-a
3. **Lakše održavanje** - Jednostavnije lociranje i ispravljanje problema
4. **Fleksibilnost** - Mogućnost korištenja pojedinačnih komponenti
5. **Testabilnost** - Manji, izolirani dijelovi olakšavaju testiranje

## Testiranje nove implementacije

Za testiranje komponenti, možete koristiti:

```tsx
import MembershipModuleTest from '@/features/membership/test/MembershipModuleTest';

// U vašoj stranici ili komponenti:
<MembershipModuleTest />
```

Ova testna komponenta paralelno prikazuje originalnu, adaptiranu i novu modularnu implementaciju radi usporedbe.

## Nastavak razvoja

Za buduće promjene i razvoj, preporučuje se:

1. Dodavanje novih funkcionalnosti kroz hooks/ direktorij
2. Modificiranje UI komponenti odvojeno od poslovne logike
3. Izdvajanje zajedničke funkcionalnosti u utility funkcije
