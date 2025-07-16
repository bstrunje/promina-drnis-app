// src/services/member.service.ts
import db, { DatabaseError } from '../utils/db.js';
import membershipService from './membership.service.js';
import memberRepository, { MemberStats, MemberCreateData, MemberUpdateData } from '../repositories/member.repository.js';
import { Member } from '../shared/types/member.js';
import bcrypt from 'bcrypt';
import { Request } from 'express';
import membershipRepository from '../repositories/membership.repository.js';
import { MembershipPeriod } from '../shared/types/membership.js';
import authRepository from '../repositories/auth.repository.js';
import auditService from './audit.service.js';
import { MembershipTypeEnum } from '../shared/types/member.js';
import { getCurrentDate, parseDate, formatDate } from '../utils/dateUtils.js';
import { differenceInMinutes } from 'date-fns';
import prisma from '../utils/prisma.js';
import type { PrismaClient, Prisma } from '@prisma/client';
import { updateAnnualStatistics } from './statistics.service.js';

// Tip za Prisma transakcijski klijent
type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

interface MemberWithActivities extends Member {
    activities?: {
        activity_id: number;
        name: string;
        date: string;
        hours_spent: number | null;
    }[];
}

// Sučelje za člana s dodatnim poljima koja dolaze iz repozitorija
interface MemberWithExtendedDetails extends Member {
    card_number?: string;
    fee_payment_year?: number;
    card_stamp_issued?: boolean;
    fee_payment_date?: string | Date;
    next_year_stamp_issued?: boolean;
    calculated_full_name?: string;
}

interface MemberWithTotalHours extends Member {
    total_hours: number;
}

export function mapMembershipTypeToEnum(value: string | MembershipTypeEnum | undefined): MembershipTypeEnum {
  if (typeof value === 'string') {
    if (value === 'regular') return MembershipTypeEnum.Regular;
    if (value === 'supporting') return MembershipTypeEnum.Supporting;
    if (value === 'honorary') return MembershipTypeEnum.Honorary;
  }
  return value as MembershipTypeEnum;
}

/**
 * Izračunava ukupne sate (u minutama) za člana i sprema ih u bazu.
 * Prioritet za izračun:
 * 1. manual_hours ako postoji (pretvoreno u minute)
 * 2. razlika između actual_start_time i actual_end_time ako manual_hours ne postoji
 * 
 * @param memberId ID člana
 * @param prismaClient Opcionalni Prisma transakcijski klijent za izvršavanje unutar transakcije
 */
export const updateMemberTotalHours = async (memberId: number, prismaClient: TransactionClient = prisma): Promise<void> => {
  try {
    // Koristimo Prisma umjesto direktnog SQL upita
    const participations = await prismaClient.activityParticipation.findMany({
      where: {
        member_id: memberId,
        activity: {
          status: 'COMPLETED'
        }
      },
      include: {
        activity: {
          select: {
            actual_start_time: true,
            actual_end_time: true,
            recognition_percentage: true // Dohvaćamo i postotak priznavanja s aktivnosti
          }
        }
      }
    });

    const totalMinutes = participations.reduce((acc: number, p: any) => {
      let minuteValue = 0;

      // Prioritet imaju manual_hours ako su postavljeni
      if (p.manual_hours !== null && p.manual_hours !== undefined) {
        minuteValue = Math.round(p.manual_hours * 60);
      } 
      // Ako manual_hours nije postavljen, računamo iz actual_start_time i actual_end_time
      else if (p.activity.actual_start_time && p.activity.actual_end_time) {
        const minutes = differenceInMinutes(
          new Date(p.activity.actual_end_time),
          new Date(p.activity.actual_start_time)
        );
        minuteValue = minutes > 0 ? minutes : 0;
      }

      // Odredi koji postotak primijeniti. Prioritet ima `recognition_override` s pojedinog sudjelovanja (za izlete).
      // Ako on ne postoji, koristi se `recognition_percentage` s cijele aktivnosti (za sastanke itd.).
      // Ako ni on ne postoji, default je 100%.
      const finalRecognitionPercentage = p.recognition_override ?? p.activity.recognition_percentage ?? 100;
      
      const recognizedMinutes = Math.round(minuteValue * (finalRecognitionPercentage / 100));

      return acc + recognizedMinutes;
    }, 0);

    // Ažuriraj polje total_hours u tablici članova koristeći isti prismaClient
    await prismaClient.member.update({
      where: { member_id: memberId },
      data: {
        total_hours: totalMinutes
      }
    });
    
    console.log(`Ažurirano ukupno sati za člana ${memberId}: ${totalMinutes} minuta`);
  } catch (error) {
    console.error(`Greška prilikom ažuriranja ukupnih sati za člana ${memberId}:`, error);
    throw error; // Propagiramo grešku kako bi transakcija bila poništena
  }
}

const memberService = {
    async getAllMembers(): Promise<Member[]> {
        try {
            return await memberRepository.findAll();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error fetching members: ' + errorMessage);
        }
    },

    async getMemberById(memberId: number): Promise<Member | null> {
        try {
            // Sada samo dohvaćamo člana, jer su sati već izračunati i spremljeni u bazi.
            const member = await memberRepository.findById(memberId);
            return member;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error fetching member: ' + errorMessage);
        }
    },

    async getMemberDashboardStats(memberId: number) {
        try {
            // I ovdje samo dohvaćamo člana, jer su sati već spremljeni u bazi.
            const member = await this.getMemberById(memberId);
            return member;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error fetching member dashboard stats: ' + errorMessage);
        }
    },

    async updateMember(memberId: number, memberData: MemberUpdateData): Promise<Member> {
        const { skills, ...basicMemberData } = memberData;

        try {
            const updatedMember = await prisma.$transaction(async (tx) => {
                // 1. Ažuriranje osnovnih podataka o članu
                const memberToUpdate: Partial<MemberUpdateData> = { ...basicMemberData };

                if (basicMemberData.first_name || basicMemberData.last_name) {
                    const currentMember = await tx.member.findUnique({ where: { member_id: memberId } });
                    if (!currentMember) throw new Error("Member not found for update");

                    const firstName = basicMemberData.first_name ?? currentMember.first_name;
                    const lastName = basicMemberData.last_name ?? currentMember.last_name;
                    memberToUpdate.full_name = `${firstName} ${lastName}`;

                                        const membershipDetails = await tx.membershipDetails.findUnique({ where: { member_id: memberId } });
                    if (membershipDetails?.card_number) {
                        const newPassword = `${memberToUpdate.full_name}-isk-${membershipDetails.card_number}`;
                        memberToUpdate.password_hash = await bcrypt.hash(newPassword, 10);
                    }
                }

                const updatedCoreMember = await tx.member.update({
                    where: { member_id: memberId },
                    data: {
                        first_name: memberToUpdate.first_name,
                        last_name: memberToUpdate.last_name,
                        full_name: memberToUpdate.full_name,
                        nickname: memberToUpdate.nickname,
                        date_of_birth: memberToUpdate.date_of_birth,
                        gender: memberToUpdate.gender,
                        street_address: memberToUpdate.street_address,
                        city: memberToUpdate.city,
                        oib: memberToUpdate.oib,
                        cell_phone: memberToUpdate.cell_phone,
                        email: memberToUpdate.email,
                        life_status: memberToUpdate.life_status,
                        tshirt_size: memberToUpdate.tshirt_size,
                        shell_jacket_size: memberToUpdate.shell_jacket_size,
                        membership_type: memberToUpdate.membership_type ? mapMembershipTypeToEnum(memberToUpdate.membership_type) : undefined,
                        other_skills: memberToUpdate.other_skills, // Dodano polje koje je nedostajalo
                        password_hash: memberToUpdate.password_hash,
                    },
                });

                // 2. Ažuriranje vještina (skills)
                if (skills) {
                    // Prvo obriši sve postojeće vještine za ovog člana
                    await tx.memberSkill.deleteMany({
                        where: { member_id: memberId },
                    });

                    // Zatim dodaj nove vještine
                    if (skills.length > 0) {
                        const memberSkillsData = skills.map(skill => ({
                            member_id: memberId,
                            skill_id: skill.skill_id,
                            is_instructor: skill.is_instructor,
                        }));

                        await tx.memberSkill.createMany({
                            data: memberSkillsData,
                        });
                    }
                }

                // 3. Vrati puni objekt člana nakon svih ažuriranja
                const finalUpdatedMember = await tx.member.findUnique({
                    where: { member_id: memberId },
                    include: {
                        membership_details: true,
                        skills: {
                            include: {
                                skill: true,
                            },
                        },
                    },
                });

                if (!finalUpdatedMember) {
                    throw new Error("Failed to fetch updated member details after transaction.");
                }

                return finalUpdatedMember as unknown as Member;
            });

            return updatedMember;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Error updating member ${memberId}:`, errorMessage);
            throw new Error('Error updating member: ' + errorMessage);
        }
    },

    async updateMemberRole(memberId: number, role: 'member' | 'member_administrator' | 'member_superuser'): Promise<Member> {
        try {
            return await memberRepository.updateRole(memberId, role);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error updating member role: ' + errorMessage);
        }
    },

    async getMemberStats(memberId: number): Promise<MemberStats> {
        try {
            const stats = await memberRepository.getStats(memberId);
            if (!stats) {
                throw new Error('Member stats not found');
            }
            return stats;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error fetching member statistics: ' + errorMessage);
        }
    },



    async createMember(memberData: MemberCreateData): Promise<Member> {
        try {
            // Set default values for new members
            const newMemberData: MemberCreateData = {
                ...memberData,
                membership_type: mapMembershipTypeToEnum(memberData.membership_type) || MembershipTypeEnum.Regular
            };

            // Ako je date_of_birth string u formatu yyyy-MM-dd, konvertiraj ga u Date objekt
            if (
                typeof newMemberData.date_of_birth === 'string' &&
                /^\d{4}-\d{2}-\d{2}$/.test(newMemberData.date_of_birth)
            ) {
                newMemberData.date_of_birth = new Date(newMemberData.date_of_birth + 'T00:00:00.000Z').toISOString();
            }

            return await memberRepository.create(newMemberData);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error creating member: ' + errorMessage);
        }
    },

    async assignPassword(memberId: number, password: string, cardNumber: string): Promise<void> {
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            await authRepository.updateMemberWithCardAndPassword(memberId, hashedPassword, cardNumber);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error assigning password: ' + errorMessage);
        }
    },

    async getMemberWithActivities(memberId: number): Promise<MemberWithActivities | null> {
        try {
            const member = await this.getMemberById(memberId);
            if (!member) return null;

            // Modificirani upit koji dohvaća sve potrebne podatke za izračun sati po aktivnosti
            const activitiesQuery = await db.query(`
                SELECT 
                    a.activity_id,
                    a.name,
                    a.start_date as date,
                    ap.manual_hours,
                    a.actual_start_time,
                    a.actual_end_time
                FROM activities a
                JOIN activity_participations ap ON a.activity_id = ap.activity_id
                WHERE ap.member_id = $1
                ORDER BY a.start_date DESC
            `, [memberId]);

            /**
             * VAŽNA NAPOMENA:
             * -------------------
             * Transformacija između polja u bazi i API odgovora:
             * 
             * Baza podataka:
             * - U tablici activity_participations imamo kolonu manual_hours (DOUBLE PRECISION)
             * - U tablici members imamo kolonu total_hours (ukupni sati aktivnosti u minutama)
             * 
             * Frontend/API očekuje:
             * - hours_spent polje po aktivnosti (umjesto manual_hours)
             * - total_hours za ukupne sate člana
             * 
             * Transformacija:
             * 1. hours_spent je virtualno/izračunato polje za frontend koje se generira iz:
             *    - manual_hours ako postoje (prioritet)
             *    - ili iz razlike actual_start_time i actual_end_time ako nije unesen manual_hours
             * 
             * 2. total_hours se odvojeno agregira preko updateMemberTotalHours funkcije koja također 
             *    koristi obje metode računanja, sekvencijalno za svaku aktivnost člana
             * 
             * Svrha: Da bi podržali i ručni unos sati i automatski izračun iz vremena aktivnosti
             */

            // Procesiramo rezultate kako bi izračunali hours_spent za svaku aktivnost
            const activitiesWithHours = activitiesQuery.rows.map(activity => {
                let hours_spent = null;
                
                // Prvo provjerimo postoji li manual_hours
                if (activity.manual_hours !== null && activity.manual_hours !== undefined) {
                    hours_spent = activity.manual_hours;
                }
                // Ako nema manual_hours, a postoje vremena početka i kraja, izračunaj razliku
                else if (activity.actual_start_time && activity.actual_end_time) {
                    const minutesDiff = differenceInMinutes(
                        new Date(activity.actual_end_time),
                        new Date(activity.actual_start_time)
                    );
                    if (minutesDiff > 0) {
                        // Pretvori minute u sate s decimalama (npr. 90 minuta = 1.5 sati)
                        hours_spent = Number((minutesDiff / 60).toFixed(2));
                    }
                }
                
                return {
                    activity_id: activity.activity_id,
                    name: activity.name,
                    date: activity.date,
                    hours_spent
                };
            });

            return {
                ...member,
                activities: activitiesWithHours
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error fetching member with activities: ' + errorMessage);
        }
    },
	
	async getMemberWithDetails(memberId: number): Promise<Member | null> {
        try {
            const member = await memberRepository.findById(memberId);
            if (!member) return null;

            const periods = await membershipRepository.getMembershipPeriods(memberId);
            const currentPeriod = await membershipRepository.getCurrentPeriod(memberId);
            
            // Frontend će sam izračunati trajanje na temelju perioda
            member.membership_history = {
                periods,
                current_period: currentPeriod ?? undefined,
            };

            return member;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error fetching member with details: ' + errorMessage);
        }
    },

    async getMemberAnnualStats(memberId: number): Promise<any> {
        try {
            const stats = await memberRepository.getAnnualStats(memberId);
            if (!stats) {
                throw new Error('Statistika nije pronađena za ovog člana.');
            }
            return stats;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error fetching member annual statistics: ' + errorMessage);
        }
    },

    async updateMembershipFee(
        memberId: number,
        paymentDate: Date,
        req: Request,
        isRenewalPayment?: boolean
    ): Promise<void> {
        try {
            const member = await this.getMemberById(memberId);
            if (!member) {
                throw new Error("Member not found");
            }
    
            const paymentMonth = paymentDate.getMonth(); // 0-11 where 10=Nov, 11=Dec
            const currentYear = getCurrentDate().getFullYear();
            
            // Determine which year to assign the payment to
            let paymentYear = currentYear;
            
            // Logic for determining payment year:
            // 1. If isRenewalPayment is explicitly true, use next year (for Nov/Dec renewals)
            // 2. If payment month is Nov (10) or Dec (11), and there's no existing payment
            //    for this year, use current year (new memberships)
            // 3. If payment month is Nov (10) or Dec (11), and there is an existing
            //    current year payment, use next year (implicit renewal)
            
            if (isRenewalPayment) {
              // Explicit renewal flag - use next year
              paymentYear = currentYear + 1;
              console.log(`Using explicit renewal: setting payment year to ${paymentYear}`);
            } else if (paymentMonth === 10 || paymentMonth === 11) { // Nov or Dec
              const existingYear = member?.membership_details?.fee_payment_year;
              
              // Check if this is potentially a renewal
              if (existingYear && existingYear >= currentYear) {
                // This is likely a renewal - assign to next year
                paymentYear = currentYear + 1;
                console.log(`Late year payment with existing current payment: setting to ${paymentYear}`);
              } else {
                // This is likely a new member or late payment for current year
                paymentYear = currentYear;
                console.log(`Late year payment for new/lapsed member: setting to ${paymentYear}`);
              }
            } else {
              // Regular payment during the year - use current year
              paymentYear = currentYear;
              console.log(`Regular payment during year: setting to ${paymentYear}`);
            }
            
            // Fix type issue - Convert the Date to ISO string for storage
            const details = {
              fee_payment_year: paymentYear,
              fee_payment_date: paymentDate, // Pass the Date object directly, not a string
            };
    
            await membershipRepository.updateMembershipDetails(memberId, details);
            
            // Call the newly added method
            await this.updateMembershipPeriodIfNeeded(memberId, paymentDate);
    
            if (req.user?.id) {
              await auditService.logAction(
                "UPDATE_MEMBERSHIP_FEE",
                req.user.id,
                `Updated membership fee for member ${memberId} to year ${paymentYear}`,
                req,
                "success",
                memberId
              );
            }
        } catch (error) {
            console.error("Service error:", error);
            throw error instanceof Error ? error : new Error(String(error));
        }
    },

    // Add the missing method
    async updateMembershipPeriodIfNeeded(memberId: number, paymentDate: Date): Promise<void> {
        try {
            // Get the latest membership period for this member
            const periods = await membershipRepository.getMembershipPeriods(memberId);
            const currentPeriod = periods.find(p => !p.end_date);
            
            // If no active period exists, create a new one starting from the payment date
            if (!currentPeriod) {
                await membershipRepository.createMembershipPeriod(memberId, paymentDate);
                console.log(`Created new membership period for member ${memberId}`);
            } else {
                console.log(`Active membership period exists for member ${memberId}, no need to create new one`);
            }
        } catch (error) {
            console.error("Error updating membership period:", error);
            throw error;
        }
    },

    async updateMembershipCard(
        memberId: number, 
        cardNumber: string, 
        stampIssued: boolean
    ): Promise<void> {
        try {
            await membershipService.updateCardDetails(memberId, cardNumber, stampIssued);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error updating card details: ' + errorMessage);
        }
    },

    async getMemberWithCardDetails(memberId: number) {
        // Always get card info from membership_details, not the members table
        return await db.query(`
            SELECT 
              m.*,
              md.card_number,
              md.card_stamp_issued,
              md.fee_payment_date
            FROM 
              members m
            LEFT JOIN 
              membership_details md ON m.member_id = md.member_id
            WHERE 
              m.member_id = $1
          `, [memberId]);
    }
};

export default memberService;