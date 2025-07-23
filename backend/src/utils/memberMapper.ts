import { Member, MemberRole, Gender, LifeStatus, MembershipTypeEnum, ClothingSize } from '../shared/types/member.js';
import { MembershipEndReason } from '../shared/types/membership.js';
import { formatDate } from './dateUtils.js';

/**
 * Mapira raw objekt iz Prisma na naš Member interfejs
 */
export function mapToMember(raw: any, total_hours: number = 0): Member {
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
      ? formatDate(raw.date_of_birth, 'yyyy-MM-dd')
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
      ? formatDate(raw.profile_image_updated_at, 'yyyy-MM-dd')
      : undefined,
    role: raw.role as MemberRole,
    registration_completed: raw.registration_completed ?? undefined,
    password_hash: raw.password_hash ?? undefined,
    last_login: raw.last_login ?? undefined,
    status: raw.status as 'registered' | 'inactive' | 'pending',
    total_hours,
    activity_status: total_hours >= 20 ? 'active' : 'passive',
    membership_type: raw.membership_type as MembershipTypeEnum,
    tshirt_size: raw.tshirt_size as ClothingSize,
    shell_jacket_size: raw.shell_jacket_size as ClothingSize,
    membership_details: {
      card_number: raw.membership_details?.card_number,
      fee_payment_year: raw.membership_details?.fee_payment_year,
      card_stamp_issued: raw.membership_details?.card_stamp_issued,
      next_year_stamp_issued: raw.membership_details?.next_year_stamp_issued,
      fee_payment_date: raw.membership_details?.fee_payment_date
        ? formatDate(raw.membership_details.fee_payment_date, 'yyyy-MM-dd')
        : undefined,
      membership_status: raw.membership_details?.status ?? undefined, // Ispravljeno iz life_status u membership_status
      active_until: raw.membership_details?.active_until
        ? formatDate(raw.membership_details.active_until, 'yyyy-MM-dd')
        : undefined
    },
    membership_history: {
      periods: (raw.periods || []).map((p: any) => ({
        period_id: p.period_id,
        member_id: raw.member_id,
        start_date: formatDate(p.start_date, 'yyyy-MM-dd'),
        end_date: p.end_date ? formatDate(p.end_date, 'yyyy-MM-dd') : undefined,
        end_reason: p.end_reason as MembershipEndReason
      }))
    },
    skills: (raw.skills || []).map((ms: any) => ({
      skill_id: ms.skill.id,
      name: ms.skill.name,
      is_instructor: ms.is_instructor
    })),
    other_skills: raw.other_skills ?? undefined,
    /**
     * Funkcije u Društvu (Predsjednik, Tajnik, Blagajnik...)
     */
    functions_in_society: raw.functions_in_society ?? undefined
  };

}
