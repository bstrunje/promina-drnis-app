// Zajednički tipovi za API module
// Uvoz osnovnih tipova iz shared/types



/**
 * Tipovi za autentikaciju
 * @see Member iz shared/types/member.ts za osnovni tip člana
 */
export interface ApiLoginResponse {
  member: {
    id: number;
    full_name: string;
    role: string;
  };
  token: string;
  refreshToken?: string;
}

/**
 * Odgovor API-ja za registraciju korisnika
 */
export interface ApiRegisterResponse {
  message: string;
  member_id?: number;
  status: 'pending';
}

/**
 * Tipovi za članstvo
 * @see MembershipDetails iz shared/types/membership.ts za osnovni tip članstva
 */
export interface ApiMembershipUpdateParams {
  paymentDate?: string;
  cardNumber?: string;
  stampIssued?: boolean;
  isRenewalPayment?: boolean;
}

/**
 * Rezultat ažuriranja članstva
 */
export interface ApiMembershipUpdateResult {
  success: boolean;
  message: string;
  membership?: {
    status: string;
    start_date: string;
    end_date?: string;
  };
}

/**
 * Rezultat prekida članstva
 */
export interface ApiTerminateMembershipResult {
  success: boolean;
  message: string;
}

/**
 * Tipovi za poruke
 */
export interface ApiAdminMessage {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  sender_type: 'member_administrator' | 'member' | 'member_superuser';
  recipient_id: string;
  recipient_type: 'member_administrator' | 'member' | 'all' | 'group';
  timestamp: string;
  read: boolean;
  priority: 'normal' | 'high';
  read_by?: string[];
}

/**
 * Generička poruka za API komunikaciju
 */
export interface ApiGenericMessage {
  created_at: string;
  id: number;
  content: string;
  sender: string;
  timestamp: string;
}

/**
 * Tipovi za markice
 */
export interface ApiStampHistoryItem {
  id: string;
  year: number;
  stamp_type: "employed" | "student" | "pensioner";
  initial_count: number;
  issued_count: number;
  reset_date: string;
  reset_by_name: string;
  notes: string | null;
}

/**
 * Rezultat resetiranja markica
 */
export interface ApiStampResetResult {
  success: boolean;
  message: string;
}

/**
 * Rezultat arhiviranja
 */
export interface ApiArchiveResult {
  success: boolean;
  message: string;
}

/**
 * Tipovi za profilne slike
 * @see Member.profile_image_path iz shared/types/member.ts
 */
export interface ApiUploadProfileImageResult {
  success: boolean;
  imagePath: string;
  message?: string;
}

/**
 * Tipovi za aktivnosti članova
 * @see activity.ts iz shared/types za osnovne tipove aktivnosti
 */
export interface ApiMemberActivity {
  id: string;
  member_id: string;
  activity_type: string;
  description: string;
  date: string;
  hours: number;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
}

/**
 * Tipovi za testne podatke
 */
export interface ApiCleanupTestDataResult {
  success: boolean;
  message: string;
  details: {
    deletedRecords: number;
    affectedMembers: number;
    memberIds: number[];
  }
}

/**
 * Tipovi za brojeve iskaznica
 * @see MembershipDetails.card_number iz shared/types/membership.ts
 */
export interface ApiCardNumbersResult {
  cards: {
    card_number: string; 
    status: 'available' | 'assigned';
    member_id?: number;
    member_name?: string;
  }[];
  stats: {
    total: number;
    available: number;
    assigned: number;
  }
}

/**
 * Rezultat dodjele broja iskaznice
 */
export interface ApiAssignCardNumberResult {
  message: string;
  card_number: string;
  status: string;
  generatedPassword?: string;
}

/**
 * Rezultat brisanja broja iskaznice
 */
export interface ApiDeleteCardNumberResult {
  message: string;
  cardNumber: string;
}

/**
 * Rezultat sinkronizacije statusa brojeva iskaznica
 */
export interface ApiSyncCardNumberStatusResult {
  updated: number;
  message: string;
}
