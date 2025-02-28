// shared/types/member.ts
import { MembershipDetails, MembershipHistory, MembershipPeriod } from './membership.js';
/**
 * Member role types
 */
export type MemberRole = 'member' | 'admin' | 'superuser';

/**
 * Membership classification types (UI display only)
 */
export type MembershipType = 'regular' | 'supporting' | 'honorary';

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
 * Main Member interface representing a society member
 */
export interface Member {
    card_stamp_issued: boolean;
    card_number: string;
    // Identification
    member_id: number;
    first_name: string;
    last_name: string;
    full_name?: string;  // Computed from first_name + last_name
    
    // Personal Information
    date_of_birth: string;
    gender: 'male' | 'female';
    street_address: string;
    city: string;
    oib: string;
    cell_phone: string;
    email: string;
    life_status: LifeStatus;
    profile_image?: string;
    
    // System Fields
    role: MemberRole;
    registration_completed: boolean;
    password_hash?: string;
    last_login?: Date;

    // Profile Information (UI/Display only)
    total_hours?: number;
    activity_status?: ActivityStatus;  // Calculated from total_hours
    membership_type: MembershipType;
    tshirt_size: ClothingSize;
    shell_jacket_size: ClothingSize;

    // Membership Information
    membership_details?: {
        fee_payment_date: string;
        card_number?: string;
        fee_payment_year?: number;
        card_stamp_issued?: boolean;
    };
    membership_history?: MembershipHistory;
}

/**
 * Used for member search functionality in login
 */
export interface MemberSearchResult {
    member_id: number;
    full_name: string;
}

/**
 * Used for profile display and calculations
 */
export interface MemberProfile {
    total_hours: number;
    activity_status: ActivityStatus;  // Calculated: 'active' if total_hours >= 20, otherwise 'passive'
    membership_type: MembershipType;
}

export interface MemberLoginData {
    full_name: string;
    password: string;
}

export type RegistrationStatus = 'pending' | 'completed';