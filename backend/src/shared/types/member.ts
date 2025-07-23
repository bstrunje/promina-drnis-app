// shared/types/member.ts
import { MembershipDetails, MembershipHistory } from './membership.js';
/**
 * Member role types
 */
export type MemberRole = 'member' | 'member_administrator' | 'member_superuser';

/**
 * Membership classification types (UI display only)
 */
/**
 * @deprecated Koristi MembershipTypeEnum umjesto ovog tipa za sve nove funkcionalnosti.
 */
/**
 * Stari string literal tip za tip članstva (deprecated).
 * NOVO: koristiti isključivo MembershipTypeEnum!
 */
export type MembershipType = 'regular' | 'supporting' | 'honorary';


/**
 * Enum za tipove članstva.
 * Koristiti isključivo enum vrijednosti kroz cijelu aplikaciju radi tip-sigurnosti i konzistentnosti.
 */
export enum MembershipTypeEnum {
    Regular = "regular",
    Honorary = "honorary",
    Supporting = "supporting"
  }

/**
 * Activity status for display
 */
export type ActivityStatus = 'active' | 'passive';

export type Gender = 'male' | 'female';

/**
 * Life status categories
 */
export type LifeStatus = 'employed/unemployed' | 'child/pupil/student' | 'pensioner';

/**
 * Available clothing sizes
 */
export type ClothingSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';

/**
 * Represents a skill a member has, including instructor status.
 */
export interface MemberSkill {
  skill_id: number;
  is_instructor: boolean;
}


/**
 * Main Member interface representing a society member
 */
export interface Member {
    member_id: number;
    first_name: string;
    last_name: string;
    full_name?: string;  // Computed from first_name + last_name
    nickname?: string;  // Opcionalni nadimak člana za lakšu identifikaciju
    
    // Personal Information
    date_of_birth: string;
    gender: 'male' | 'female';
    street_address: string;
    city: string;
    oib: string;
    cell_phone: string;
    email: string;
    life_status?: LifeStatus;
    profile_image?: string; // Legacy field
    profile_image_path?: string; // New field used by Prisma schema
    profile_image_updated_at?: string; // Timestamp of last profile image update
    
    // System Fields
    role?: MemberRole;
    registration_completed?: boolean;
    password_hash?: string;
    last_login?: Date;
    status?: 'registered' | 'inactive' | 'pending';  // Added status field
    
    // Authentication security fields
    failed_login_attempts?: number;  // Broj neuspjelih pokušaja prijave
    locked_until?: Date;           // Vrijeme do kojeg je račun zaključan
    last_failed_login?: Date;       // Vrijeme zadnjeg neuspjelog pokušaja prijave

    // Profile Information (UI/Display only)
    total_hours?: number;
    activity_status?: ActivityStatus;  // Calculated from total_hours
    membership_type?: MembershipTypeEnum; // Migrirano na enum
    tshirt_size?: ClothingSize;
    shell_jacket_size?: ClothingSize;

    // Informacije o članskoj iskaznici i članarini (izvor istine)
    membership_details: MembershipDetails; // Uvijek prisutan objekt s detaljima članstva

    // Legacy polja za kompatibilnost (ne koristiti, migrirano u membership_details)
    // card_number?: string;
    // card_stamp_issued?: boolean;
    // fee_payment_year?: number;
    // next_year_stamp_issued?: boolean;
    membership_history?: MembershipHistory;

    // Member skills and qualifications
    skills?: MemberSkill[];
    other_skills?: string;
    /**
     * Funkcije u Društvu (Predsjednik, Tajnik, Blagajnik...)
     * Višestruke vrijednosti odvojene zarezom, npr. "Predsjednik, Tajnik"
     */
    functions_in_society?: string;
}

/**
 * Used for member search functionality in login
 */
export interface MemberSearchResult {
    member_id: number;
    full_name: string;
    oib: string;
    nickname?: string;
}

/**
 * Used for profile display and calculations
 */
export interface MemberProfile {
    total_hours: number;
    activity_status: ActivityStatus;  // Calculated: 'active' if total_hours >= 20, otherwise 'passive'
    membership_type: MembershipTypeEnum; // Migrirano na enum
}

export interface MemberLoginData {
    email: string; // Dodano
    password: string;
}

export type RegistrationStatus = 'pending' | 'completed';