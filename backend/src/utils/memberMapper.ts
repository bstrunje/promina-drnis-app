import { Member, MemberRole, Gender, LifeStatus, MembershipTypeEnum, ClothingSize, ActivityStatus } from '../shared/types/member.js';
import { MembershipEndReason } from '../shared/types/membership.js';
import { formatDate } from './dateUtils.js';

/**
 * Mapira raw objekt iz Prisma na naš Member interfejs
 */
type MemberRaw = {
  member_id: number;
  first_name: string;
  last_name: string;
  nickname?: string | null;
  date_of_birth?: string | Date | null;
  gender?: string | null;
  street_address: string;
  city: string;
  oib: string;
  cell_phone: string;
  email?: string | null;
  life_status?: string | null;
  profile_image_path?: string | null;
  profile_image_updated_at?: string | Date | null;
  role: string;
  registration_completed?: boolean | null;
  password_hash?: string | null;
  last_login?: string | Date | null;
  status?: string | null;
  membership_type?: string | null;
  tshirt_size?: string | null;
  shell_jacket_size?: string | null;
  hat_size?: string | null;
  tshirt_delivered?: boolean | null;
  shell_jacket_delivered?: boolean | null;
  hat_delivered?: boolean | null;
  membership_details?: {
    card_number?: string | null;
    fee_payment_year?: number | null;
    card_stamp_issued?: boolean | null;
    next_year_stamp_issued?: boolean | null;
    fee_payment_date?: string | Date | null;
    status?: string | null;
    active_until?: string | Date | null;
  } | null;
  periods?: Array<{
    period_id: number;
    start_date: string | Date;
    end_date?: string | Date | null;
    end_reason?: string | null;
  }> | null;
  skills?: Array<{
    skill: { id: number; name: string };
    is_instructor?: boolean | null;
  }> | null;
  other_skills?: string | null;
  functions_in_society?: string | null;
};

export function mapToMember(raw: MemberRaw, total_hours: number = 0): Member {
  // Pomoćna funkcija za konverziju string | Date u Date
  const toDate = (v: string | Date): Date => (v instanceof Date ? v : new Date(v));
  const full_name = raw.nickname && raw.nickname !== ''
    ? `${raw.first_name} ${raw.last_name} - ${raw.nickname}`
    : `${raw.first_name} ${raw.last_name}`;
  return {
    member_id: raw.member_id,
    first_name: raw.first_name,
    last_name: raw.last_name,
    full_name,
    nickname: raw.nickname ?? undefined,
    date_of_birth: raw.date_of_birth
      ? formatDate(toDate(raw.date_of_birth), 'yyyy-MM-dd')
      : '',
    gender: raw.gender as Gender,
    street_address: raw.street_address,
    city: raw.city,
    oib: raw.oib,
    cell_phone: raw.cell_phone,
    email: raw.email ?? '',
    life_status: raw.life_status as LifeStatus,
    profile_image_path: raw.profile_image_path ?? undefined,
    profile_image_updated_at: raw.profile_image_updated_at
      ? formatDate(toDate(raw.profile_image_updated_at), 'yyyy-MM-dd')
      : undefined,
    role: raw.role as MemberRole,
    registration_completed: raw.registration_completed ?? undefined,
    password_hash: raw.password_hash ?? undefined,
    last_login: raw.last_login ? toDate(raw.last_login) : undefined,
    status: ((): 'registered' | 'inactive' | 'pending' => {
      const s = raw.status ?? undefined;
      return s === 'registered' || s === 'inactive' || s === 'pending' ? s : 'pending';
    })(),
    total_hours,
    activity_status: total_hours >= 20 ? 'active' : 'passive',
    membership_type: ((): MembershipTypeEnum | undefined => {
      const t = raw.membership_type ?? undefined;
      if (t === 'regular' || t === 'honorary' || t === 'supporting') {
        return t as MembershipTypeEnum;
      }
      return undefined;
    })(),
    tshirt_size: ((): ClothingSize | undefined => {
      const v = raw.tshirt_size ?? undefined;
      const allowed: ClothingSize[] = ['XS','S','M','L','XL','XXL','XXXL'];
      return (v && (allowed as readonly string[]).includes(v)) ? (v as ClothingSize) : undefined;
    })(),
    shell_jacket_size: ((): ClothingSize | undefined => {
      const v = raw.shell_jacket_size ?? undefined;
      const allowed: ClothingSize[] = ['XS','S','M','L','XL','XXL','XXXL'];
      return (v && (allowed as readonly string[]).includes(v)) ? (v as ClothingSize) : undefined;
    })(),
    hat_size: ((): ClothingSize | undefined => {
      const v = raw.hat_size ?? undefined;
      const allowed: ClothingSize[] = ['XS','S','M','L','XL','XXL','XXXL'];
      return (v && (allowed as readonly string[]).includes(v)) ? (v as ClothingSize) : undefined;
    })(),
    tshirt_delivered: (raw.tshirt_delivered ?? undefined) ?? false,
    shell_jacket_delivered: (raw.shell_jacket_delivered ?? undefined) ?? false,
    hat_delivered: (raw.hat_delivered ?? undefined) ?? false,
    membership_details: {
      card_number: raw.membership_details?.card_number ?? undefined,
      fee_payment_year: raw.membership_details?.fee_payment_year ?? undefined,
      card_stamp_issued: raw.membership_details?.card_stamp_issued ?? undefined,
      next_year_stamp_issued: raw.membership_details?.next_year_stamp_issued ?? undefined,
      fee_payment_date: raw.membership_details?.fee_payment_date
        ? formatDate(toDate(raw.membership_details.fee_payment_date), 'yyyy-MM-dd')
        : undefined,
      membership_status: ((): ActivityStatus | undefined => {
        const s = raw.membership_details?.status ?? undefined;
        return s === 'active' || s === 'passive' ? (s as ActivityStatus) : undefined;
      })(),
      active_until: raw.membership_details?.active_until
        ? formatDate(toDate(raw.membership_details.active_until), 'yyyy-MM-dd')
        : undefined
    },
    membership_history: {
      periods: (raw.periods || []).map((p) => ({
        period_id: p.period_id,
        member_id: raw.member_id,
        start_date: formatDate(toDate(p.start_date), 'yyyy-MM-dd'),
        end_date: p.end_date ? formatDate(toDate(p.end_date), 'yyyy-MM-dd') : undefined,
        end_reason: p.end_reason as MembershipEndReason
      }))
    },
    skills: (raw.skills || []).map((ms) => ({
      skill_id: ms.skill.id,
      name: ms.skill.name,
      is_instructor: !!ms.is_instructor
    })),
    other_skills: raw.other_skills ?? undefined,
    /**
     * Funkcije u Društvu (Predsjednik, Tajnik, Blagajnik...)
     */
    functions_in_society: raw.functions_in_society ?? undefined
  };

}
