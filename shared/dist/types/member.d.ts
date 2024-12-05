/**
 * Member status types
 * - pending: New member awaiting admin approval
 * - active: Member with sufficient activity hours
 * - passive: Member with insufficient activity hours
 */
export type MemberStatus = 'pending' | 'active' | 'passive';
/**
 * Member role types
 * - member: Default role for new registrations
 * - admin: Administrative privileges
 * - superuser: Full system access
 */
export type MemberRole = 'member' | 'admin' | 'superuser';
/**
 * Membership classification types
 * - regular: Standard membership
 * - supporting: Supporting member status
 * - honorary: Honorary member status
 */
export type MembershipType = 'regular' | 'supporting' | 'honorary';
/**
 * Member life status categories
 */
export type LifeStatus = 'employed/unemployed' | 'child/pupil/student' | 'pensioner';
/**
 * Available clothing sizes for member equipment
 */
export type ClothingSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';
/**
 * Member gender types
 */
export type Gender = 'male' | 'female';
/**
 * Main Member interface representing a society member
 */
export interface Member {
    member_id: number;
    first_name: string;
    last_name: string;
    full_name?: string;
    date_of_birth: string;
    gender: Gender;
    street_address: string;
    city: string;
    oib: string;
    cell_phone: string;
    email: string;
    status: MemberStatus;
    membership_type: MembershipType;
    life_status: LifeStatus;
    role: MemberRole;
    tshirt_size: ClothingSize;
    shell_jacket_size: ClothingSize;
    password_hash?: string;
    total_hours?: number;
    last_login?: Date;
}
export interface MemberLoginData {
    full_name: string;
    password: string;
}
export interface MemberSearchResult {
    member_id: number;
    full_name: string;
}
