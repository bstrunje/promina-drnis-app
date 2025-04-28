# Struktura i tipovi podataka

Ovaj dokument detaljno opisuje glavne modele podataka koji se koriste u Promina Drniš aplikaciji.

## Član (Member)

Centralni entitet aplikacije koji predstavlja člana društva.

### Glavni atributi

```typescript
interface Member {
    member_id: number;
    first_name: string;
    last_name: string;
    full_name?: string;  // Izračunato polje: first_name + last_name
    
    // Osobni podaci
    date_of_birth: string;
    gender: 'male' | 'female';
    street_address: string;
    city: string;
    oib: string;
    cell_phone: string;
    email: string;
    life_status?: LifeStatus;
    profile_image?: string; 
    profile_image_path?: string;
    profile_image_updated_at?: string;
    
    // Sistemski atributi
    role?: MemberRole;
    registration_completed?: boolean;
    password_hash?: string;
    last_login?: Date;
    status?: 'registered' | 'inactive' | 'pending';

    // Profilni podaci (UI/Prikaz)
    total_hours?: number;
    activity_status?: ActivityStatus;
    membership_type?: MembershipType;
    tshirt_size?: ClothingSize;
    shell_jacket_size?: ClothingSize;

    // Podaci vezani uz iskaznicu
    card_number?: string;
    card_stamp_issued?: boolean;
    fee_payment_year?: number;
    next_year_stamp_issued?: boolean;

    // Informacije o članstvu
    membership_details?: {
        fee_payment_date?: string;
        card_number?: string;
        fee_payment_year?: number;
        card_stamp_issued?: boolean;
        next_year_stamp_issued?: boolean;
    };
    membership_history?: MembershipHistory;
}
```

### Povezani tipovi

```typescript
// Uloge članova
type MemberRole = 'member' | 'admin' | 'superuser';

// Klasifikacija članstva (samo za UI prikaz)
type MembershipType = 'regular' | 'supporting' | 'honorary';

// Status aktivnosti
type ActivityStatus = 'active' | 'passive';

// Spol
type Gender = 'male' | 'female';

// Kategorije životnog statusa
type LifeStatus = 'employed/unemployed' | 'child/pupil/student' | 'pensioner';

// Veličine odjeće
type ClothingSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';
```

## Članstvo (Membership)

Definira razdoblja članstva i povezane podatke o članarinama.

### MembershipPeriod

```typescript
interface MembershipPeriod {
    id: number;
    member_id: number;
    start_date: string;
    end_date: string | null;
    end_reason?: MembershipEndReason | null;
    notes?: string;
    created_at?: string;
    updated_at?: string;
}
```

### MembershipEndReason

```typescript
enum MembershipEndReason {
    WITHDRAWAL = 'withdrawal', // Istupanje
    EXCLUSION = 'exclusion',   // Isključenje
    DEATH = 'death',           // Smrt
    INACTIVITY = 'inactivity', // Neaktivnost
    OTHER = 'other'            // Ostalo
}
```

### MembershipHistory

```typescript
interface MembershipHistory {
    periods: MembershipPeriod[];
    fee_payments: FeePayment[];
}
```

### FeePayment

```typescript
interface FeePayment {
    id: number;
    member_id: number;
    payment_date: string;
    amount: number;
    payment_year: number;
    notes?: string;
    created_at?: string;
    updated_at?: string;
}
```

## Status članstva (MembershipStatus)

Definira logiku za određivanje trenutnog statusa članstva na temelju različitih faktora.

### MembershipStatus

```typescript
enum MembershipStatus {
    ACTIVE = 'active',         // Aktivno članstvo
    INACTIVE = 'inactive',     // Neaktivno članstvo
    UNKNOWN = 'unknown',       // Nepoznato
    DECEASED = 'deceased',     // Preminuo član
    EXCLUDED = 'excluded',     // Isključen član
    WITHDRAWAL = 'withdrawal', // Član koji je istupio
    NOT_MEMBER = 'not_member'  // Nije član
}
```

### DetailedMembershipStatus

```typescript
interface DetailedMembershipStatus {
    status: MembershipStatus;
    reason?: string;
    date?: string | null;
    endReason?: MembershipEndReason | null;
    description?: string;
}
```

### MembershipStatusPriority

```typescript
enum MembershipStatusPriority {
    DECEASED = 1,    // Najviši prioritet - preminuli članovi
    EXCLUDED = 2,    // Isključeni članovi
    WITHDRAWAL = 3,  // Članovi koji su ispisani
    INACTIVE = 4,    // Neaktivni članovi
    ACTIVE = 5,      // Aktivni članovi
    UNKNOWN = 6      // Najniži prioritet - nepoznati status
}
```

## Aktivnost (Activity)

Predstavlja aktivnosti članova društva.

### Activity

```typescript
interface Activity {
    id: number;
    title: string;
    description?: string;
    date: string;
    location?: string;
    hours: number;
    notes?: string;
    created_at?: string;
    updated_at?: string;
    is_deleted?: boolean;
    participants?: ActivityParticipant[];
}
```

### ActivityParticipant

```typescript
interface ActivityParticipant {
    id: number;
    activity_id: number;
    member_id: number;
    hours: number;
    notes?: string;
    created_at?: string;
    updated_at?: string;
    member?: {
        first_name: string;
        last_name: string;
    };
}
```

## Veze i relacije

### Član → Članstvo
- Jedan član može imati više razdoblja članstva (one-to-many)
- Jedan član može imati više evidencija uplate članarine (one-to-many)

### Član → Aktivnost
- Jedan član može sudjelovati u više aktivnosti (many-to-many)
- Veza se ostvaruje kroz ActivityParticipant

### Aktivnost → Sudionici
- Jedna aktivnost može imati više sudionika (many-to-many)
- Veza se ostvaruje kroz ActivityParticipant

## Logika određivanja statusa

Aplikacija koristi nekoliko funkcija za određivanje statusa člana, uključujući:

### determineMembershipStatus
Određuje status članstva (aktivan, neaktivan, itd.) na temelju razdoblja članstva i uplate članarine.

### determineDetailedMembershipStatus
Proširuje status s dodatnim detaljima, uključujući razlog i datum.

### determineMemberActivityStatus
Određuje status aktivnosti člana ('active' ili 'passive') na temelju broja odrađenih sati.

### hasPaidMembershipFee
Provjerava je li član platio članarinu za određenu godinu.

## Primjeri korištenja

### Dohvaćanje člana s detaljima

```typescript
// MemberList.tsx
const fetchMemberDetails = async () => {
    try {
        const response = await api.get(`/api/members/${member_id}`);
        const memberData = response.data;
        
        // Određivanje statusa članstva
        const detailedStatus = determineDetailedMembershipStatus(
            adaptMembershipPeriods(memberData.membership_periods || []),
            memberData.fee_payments || []
        );
        
        setMember({
            ...memberData,
            detailedStatus
        });
    } catch (error) {
        console.error('Error fetching member details:', error);
    }
};
```

### Prikaz statusa članstva

```typescript
// MembershipFeeSection.tsx
const statusLabel = useMemo(() => {
    switch (detailedStatus.status) {
        case MembershipStatus.ACTIVE:
            return "Aktivan član";
        case MembershipStatus.INACTIVE:
            return "Neaktivan član";
        case MembershipStatus.DECEASED:
            return "Preminuo";
        case MembershipStatus.EXCLUDED:
            return "Isključen";
        case MembershipStatus.WITHDRAWAL:
            return "Istupio iz članstva";
        default:
            return "Nepoznat status";
    }
}, [detailedStatus.status]);
```

## Dijagram strukture podataka

```
+-------------+       +-------------------+       +------------+
|   Member    |<----->| MembershipPeriod  |       |  Activity  |
+-------------+       +-------------------+       +------------+
| member_id   |       | id                |       | id         |
| first_name  |       | member_id         |       | title      |
| last_name   |       | start_date        |       | date       |
| ...         |       | end_date          |       | hours      |
+-------------+       | end_reason        |       | ...        |
      ^               +-------------------+       +------------+
      |                        ^                       ^
      |                        |                       |
      |               +-------------------+    +-------------------+
      +-------------->|   FeePayment      |    | ActivityParticipant|
                      +-------------------+    +-------------------+
                      | id                |    | id                |
                      | member_id         |    | activity_id       |
                      | payment_date      |    | member_id         |
                      | amount            |    | hours             |
                      | payment_year      |    | ...               |
                      +-------------------+    +-------------------+
```

## Prisma shema

Za detalje implementacije podatkovne baze, pogledajte Prisma shemu u `backend/prisma/schema.prisma`.
