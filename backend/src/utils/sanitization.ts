import { SystemSettings } from '../shared/types/settings.js';

export const sanitizeInput = (input: Partial<SystemSettings>): Partial<SystemSettings> => {
  return {
    cardNumberLength: input.cardNumberLength ? Math.floor(Number(input.cardNumberLength)) : undefined,
    renewalStartDay: input.renewalStartDay ? Math.floor(Number(input.renewalStartDay)) : undefined,
    renewalStartMonth: input.renewalStartMonth ? Math.floor(Number(input.renewalStartMonth)) : undefined,
    allowFormerMembersInSelectors: typeof input.allowFormerMembersInSelectors === 'boolean'
      ? input.allowFormerMembersInSelectors
      : undefined
  };
};

// ============================================================================
// MEMBER DATA SANITIZATION - Privacy Protection
// ============================================================================

/**
 * SUPER osjetljiva polja - SAMO SUPERUSER može vidjeti
 * (Najosjetljiviji osobni podaci)
 */
const SUPER_SENSITIVE_FIELDS = [
  'oib',                              // Osobni identifikacijski broj
  'password_hash',                     // Hash lozinke
  'two_factor_secret',                 // 2FA secret
  'two_factor_recovery_codes_hash',    // 2FA recovery codes
];

/**
 * Osjetljiva polja - Administrator NE može vidjeti (osim za svoj profil)
 * (Privatni kontakt podaci)
 * NAPOMENA: Trenutno admin vidi sve osim SUPER_SENSITIVE_FIELDS
 */
const _ADMIN_SENSITIVE_FIELDS = [
  'cell_phone',
  'email',
  'street_address',
  'city',
  'date_of_birth',
  'failed_login_attempts',
  'last_failed_login',
  'locked_until'
];

/**
 * Polja koja OBIČNI ČLANOVI mogu vidjeti
 * (Javni podaci - vidljivi u UI i Network tab-u)
 * NAPOMENA: Ovi podaci će biti vidljivi u DevTools-u!
 */
const PUBLIC_FIELDS = [
  'member_id',
  'first_name',
  'last_name',
  'profile_image_path',
  'nickname',
  'gender',
  'life_status',           // Tip markice (employed, child, pensioner)
  'status',                // Status člana (active/pending/inactive)
  'role',                  // Rola (member/administrator)
  'membership_type',       // Tip članstva (Regular/Honorary)
  'total_hours',           // Ukupno sati
  'activity_hours',        // Sati aktivnosti
  'membership_details',    // Detalji članstva (card_number maskirano!)
  'membership_history',    // Povijest članstva (periods) - potrebno za prikaz statusa
  'skills',                // Vještine i osposobljenosti - javni podaci
  'other_skills',          // Ostale vještine (custom text)
  'functions_in_society'   // Funkcije u društvu (Predsjednik, Tajnik...)
];

/**
 * Provjerava da li objekt izgleda kao Member objekt
 */
export function isMemberObject(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  
  // Mora imati member_id i first_name/last_name
  return (
    'member_id' in obj &&
    ('first_name' in obj || 'last_name' in obj)
  );
}

/**
 * Provjerava da li korisnik ima SUPERUSER rolu
 * Samo superuser vidi SVE podatke uključujući OIB
 */
export function isSuperuser(role: string | undefined): boolean {
  if (!role) return false;
  return role === 'member_superuser';
}

/**
 * Provjerava da li korisnik ima administratorsku rolu
 * Administrator može upravljati članovima, ali NE vidi OIB i najosjetljivije podatke
 */
export function isAdministrator(role: string | undefined): boolean {
  if (!role) return false;
  return role === 'member_administrator';
}

/**
 * Sanitizira pojedinačni member objekt prema razini pristupa
 * 
 * RAZINE PRISTUPA:
 * 1. Superuser → Vidi SVE (uključujući OIB)
 * 2. Vlastiti profil → Vidi SVE svoje podatke
 * 3. Administrator → Vidi administrativne podatke, ALI NE i OIB/super-osjetljive podatke
 * 4. Obični član → Vidi samo javne podatke
 */
export function sanitizeMemberObject(
  member: unknown,
  requestingUserId?: number,
  requestingUserRole?: string
): unknown {
  if (!isMemberObject(member)) return member;
  
  // Type assertion nakon provjere isMemberObject
  const memberObj = member as Record<string, unknown> & { member_id: number };
  
  // 1. SUPERUSER vidi SVE - bez sanitizacije
  if (isSuperuser(requestingUserRole)) {
    return memberObj;
  }
  
  // 2. Korisnik vidi SVE u svom profilu
  if (requestingUserId && memberObj.member_id === requestingUserId) {
    return memberObj;
  }
  
  // 3. ADMINISTRATOR - ukloni samo SUPER_SENSITIVE polja (OIB, password_hash, itd.)
  if (isAdministrator(requestingUserRole)) {
    const sanitized = { ...memberObj };
    SUPER_SENSITIVE_FIELDS.forEach(field => {
      delete sanitized[field];
    });
    return sanitized;
  }
  
  // 4. OBIČNI ČLAN - vrati SAMO javne podatke (whitelist pristup)
  const publicData: Record<string, unknown> = {};
  PUBLIC_FIELDS.forEach(field => {
    if (field in memberObj) {
      publicData[field] = memberObj[field];
    }
  });
  
  // KRITIČNO: Maskiraj card_number jer se koristi za autentikaciju
  if (publicData.membership_details && typeof publicData.membership_details === 'object') {
    const details = publicData.membership_details as Record<string, unknown>;
    const sanitizedDetails = { ...details };
    
    // Maskiraj card_number - zamijeni pravu vrijednost s maskiranom
    if (sanitizedDetails.card_number && typeof sanitizedDetails.card_number === 'string') {
      const cardNumber = sanitizedDetails.card_number;
      const lastDigits = cardNumber.slice(-2); // Zadnje 2 znamenke
      sanitizedDetails.card_number = `***${lastDigits}`; // Zamijeni s maskiranim (npr. "***01")
    }
    
    publicData.membership_details = sanitizedDetails;
  }
  
  return publicData;
}

/**
 * Recursivno sanitizira bilo koji objekt/array koji može sadržavati member podatke
 */
export function sanitizeResponseData(
  data: unknown,
  requestingUserId?: number,
  requestingUserRole?: string
): unknown {
  // Null ili undefined - vrati kao što je
  if (data == null) return data;
  
  // Primitive type - vrati kao što je
  if (typeof data !== 'object') return data;
  
  // Array - sanitiziraj svaki element
  if (Array.isArray(data)) {
    return data.map(item => sanitizeResponseData(item, requestingUserId, requestingUserRole));
  }
  
  // Object - provjeri je li member, ako da sanitiziraj
  if (isMemberObject(data)) {
    return sanitizeMemberObject(data, requestingUserId, requestingUserRole);
  }
  
  // Regular object - recursivno sanitiziraj nested objekte
  const sanitized: Record<string, unknown> = {};
  const dataObj = data as Record<string, unknown>;
  for (const key in dataObj) {
    if (Object.prototype.hasOwnProperty.call(dataObj, key)) {
      sanitized[key] = sanitizeResponseData(dataObj[key], requestingUserId, requestingUserRole);
    }
  }
  
  return sanitized;
}