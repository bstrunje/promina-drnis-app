// src/services/member.service.ts
import membershipService from './membership.service.js';
import { Request } from 'express';
import memberRepository, { MemberStats, MemberCreateData, MemberUpdateData } from '../repositories/member.repository.js';
import { Member } from '../shared/types/member.js';
import bcrypt from 'bcrypt';
import membershipRepository from '../repositories/membership.repository.js';
import authRepository from '../repositories/auth.repository.js';
import auditService from './audit.service.js';
import { MembershipTypeEnum } from '../shared/types/member.js';
import { getCurrentDate } from '../utils/dateUtils.js';
import { differenceInMinutes } from 'date-fns';
import prisma from '../utils/prisma.js';
import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { getOrganizationId } from '../middleware/tenant.middleware.js';
import { getRoleRecognitionSettings, getRoleRecognitionPercentage } from '../utils/roleRecognitionCache.js';

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



export function mapMembershipTypeToEnum(value: string | MembershipTypeEnum | undefined): MembershipTypeEnum {
  if (typeof value === 'string') {
    if (value === 'regular') return MembershipTypeEnum.Regular;
    if (value === 'supporting') return MembershipTypeEnum.Supporting;
    if (value === 'honorary') return MembershipTypeEnum.Honorary;
  }
  return value as MembershipTypeEnum;
}

/**
 * Izračunava ukupne sate (u minutama) za člana za SVE GODINE i sprema ih u total_hours polje.
 * Koristi se za ukupne statistike.
 * 
 * Prioritet za izračun:
 * 1. manual_hours ako postoji (pretvoreno u minute)
 * 2. razlika između actual_start_time i actual_end_time ako manual_hours ne postoji
 * 
 * @param memberId ID člana
 * @param prismaClient Opcionalni Prisma transakcijski klijent za izvršavanje unutar transakcije
 */
export const updateMemberTotalHours = async (memberId: number, prismaClient: TransactionClient = prisma): Promise<void> => {
  try {
    // Koristimo Prisma umjesto direktnog SQL upita - SVE GODINE
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
            manual_hours: true,
            actual_start_time: true,
            actual_end_time: true,
            recognition_percentage: true
          }
        }
      }
    });

    const totalMinutes = participations.reduce((acc: number, p: {
      manual_hours: number | null;
      recognition_override?: number | null;
      activity: {
        manual_hours: number | null;
        actual_start_time: Date | string | null;
        actual_end_time: Date | string | null;
        recognition_percentage?: number | null;
      };
    }) => {
      let minuteValue = 0;

      if (p.activity.manual_hours !== null && p.activity.manual_hours !== undefined && p.activity.manual_hours > 0) {
        minuteValue = p.activity.manual_hours * 60;
      } else if (p.manual_hours !== null && p.manual_hours !== undefined) {
        minuteValue = Math.round(p.manual_hours * 60);
      } else if (p.activity.actual_start_time && p.activity.actual_end_time) {
        const minutes = differenceInMinutes(
          new Date(p.activity.actual_end_time),
          new Date(p.activity.actual_start_time)
        );
        minuteValue = minutes > 0 ? minutes : 0;
      }

      const finalRecognitionPercentage = p.recognition_override ?? p.activity.recognition_percentage ?? 100;
      const recognizedMinutes = Math.round(minuteValue * (finalRecognitionPercentage / 100));

      return acc + recognizedMinutes;
    }, 0);

    // Ažuriraj polje total_hours u tablici članova
    await prismaClient.member.update({
      where: { member_id: memberId },
      data: {
        total_hours: totalMinutes
      }
    });
    
    console.log(`Ažurirano ukupno sati za člana ${memberId}: ${totalMinutes} minuta (sve godine)`);
  } catch (error) {
    console.error(`Greška prilikom ažuriranja ukupnih sati za člana ${memberId}:`, error);
    throw error;
  }
}

/**
 * Izračunava sate aktivnosti (u minutama) za člana za PROŠLU I TEKUĆU GODINU i sprema ih u activity_hours polje.
 * Koristi se za određivanje statusa aktivnosti člana (aktivan/pasivan).
 * 
 * Prioritet za izračun:
 * 1. manual_hours ako postoji (pretvoreno u minute)
 * 2. razlika između actual_start_time i actual_end_time ako manual_hours ne postoji
 * 
 * @param memberId ID člana
 * @param prismaClient Opcionalni Prisma transakcijski klijent za izvršavanje unutar transakcije
 */
export const updateMemberActivityHours = async (memberId: number, prismaClient: TransactionClient = prisma): Promise<void> => {
  try {
    // Ako član NEMA nijedan aktivan period članstva, poništavamo activity_hours na 0.
    // Ovo direktno prati logiku da je član neaktivan kada nema aktivnih perioda.
    const activePeriodsCount = await prismaClient.membershipPeriod.count({
      where: {
        member_id: memberId,
        end_date: null
      }
    });

    if (activePeriodsCount === 0) {
      await prismaClient.member.update({
        where: { member_id: memberId },
        data: { activity_hours: 0 }
      });
      console.log(`Poništeni activity_hours za člana ${memberId} (nema aktivnih perioda)`);
      return;
    }

    // Računamo sate samo za prošlu i tekuću godinu
    const currentYear = getCurrentDate().getFullYear();
    const previousYear = currentYear - 1;
    
    // Datumi za ograničavanje na prošlu i tekuću godinu
    const startOfPreviousYear = new Date(previousYear, 0, 1); // 1. siječnja prošle godine
    const endOfCurrentYear = new Date(currentYear, 11, 31, 23, 59, 59); // 31. prosinca tekuće godine
    
    // Koristimo Prisma umjesto direktnog SQL upita
    const participations = await prismaClient.activityParticipation.findMany({
      where: {
        member_id: memberId,
        activity: {
          status: 'COMPLETED',
          // Ograničavamo na aktivnosti iz prošle i tekuće godine
          start_date: {
            gte: startOfPreviousYear,
            lte: endOfCurrentYear
          }
        }
      },
      include: {
        activity: {
          select: {
            manual_hours: true,
            actual_start_time: true,
            actual_end_time: true,
            recognition_percentage: true // Dohvaćamo i postotak priznavanja s aktivnosti
          }
        }
      }
    });

    const activityMinutes = participations.reduce((acc: number, p: {
      manual_hours: number | null;
      recognition_override?: number | null;
      activity: {
        manual_hours: number | null;
        actual_start_time: Date | string | null;
        actual_end_time: Date | string | null;
        recognition_percentage?: number | null;
      };
    }) => {
      let minuteValue = 0;

      // Prioritet imaju manual_hours ako su postavljeni
      if (p.activity.manual_hours !== null && p.activity.manual_hours !== undefined && p.activity.manual_hours > 0) {
        minuteValue = p.activity.manual_hours * 60;
      } else if (p.manual_hours !== null && p.manual_hours !== undefined) {
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

    // Ažuriraj polje activity_hours u tablici članova
    await prismaClient.member.update({
      where: { member_id: memberId },
      data: {
        activity_hours: activityMinutes
      }
    });
    
    console.log(`Ažurirano activity_hours za člana ${memberId}: ${activityMinutes} minuta (prošla i tekuća godina: ${previousYear}-${currentYear})`);
  } catch (error) {
    console.error(`Greška prilikom ažuriranja activity_hours za člana ${memberId}:`, error);
    throw error; // Propagiramo grešku kako bi transakcija bila poništena
  }
}

/**
 * Ažurira total_hours i activity_hours za sve članove (korisno za migraciju ili periodično ažuriranje)
 * - total_hours: sve godine (za statistike)
 * - activity_hours: prošla i tekuća godina (za status aktivnosti)
 */
export const updateAllMembersTotalHours = async (): Promise<void> => {
  try {
    console.log('Pokretanje masovnog ažuriranja total_hours i activity_hours za sve članove...');
    
    // Dohvati sve članove
    const allMembers = await prisma.member.findMany({
      select: { member_id: true, first_name: true, last_name: true }
    });
    
    console.log(`Pronađeno ${allMembers.length} članova za ažuriranje.`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Ažuriraj svakog člana pojedinačno
    for (const member of allMembers) {
      try {
        // Ažuriraj oba polja - total_hours (sve godine) i activity_hours (prošla+tekuća)
        await updateMemberTotalHours(member.member_id);
        await updateMemberActivityHours(member.member_id);
        successCount++;
        console.log(`✓ Ažuriran član ${member.first_name} ${member.last_name} (ID: ${member.member_id})`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Greška kod člana ${member.first_name} ${member.last_name} (ID: ${member.member_id}):`, error);
      }
    }
    
    console.log(`Masovno ažuriranje završeno. Uspješno: ${successCount}, Greške: ${errorCount}`);
  } catch (error) {
    console.error('Greška prilikom masovnog ažuriranja članova:', error);
    throw error;
  }
};

const memberService = {
    async getAllMembers(req: Request): Promise<Member[]> {
        const organizationId = getOrganizationId(req);
        try {
            return await memberRepository.findAll(organizationId);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error fetching members: ' + errorMessage);
        }
    },

    async getMemberById(req: Request, memberId: number): Promise<Member | null> {
        const organizationId = getOrganizationId(req);
        try {
            // Sada samo dohvaćamo člana, jer su sati već izračunati i spremljeni u bazi.
            const member = await memberRepository.findById(organizationId, memberId);
            return member;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error fetching member: ' + errorMessage);
        }
    },

    async getMemberDashboardStats(req: Request, memberId: number) {
        try {
            // I ovdje samo dohvaćamo člana, jer su sati već spremljeni u bazi.
            const member = await this.getMemberById(req, memberId);
            return member;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error fetching member dashboard stats: ' + errorMessage);
        }
    },

    async updateMember(memberId: number, memberData: MemberUpdateData): Promise<Member | null> {
        const { skills, ...basicMemberData } = memberData;

        // Trim whitespace iz text polja prije spremanja u bazu
        const cleanedData = {
            ...basicMemberData,
            first_name: basicMemberData.first_name?.trim(),
            last_name: basicMemberData.last_name?.trim(),
            email: basicMemberData.email?.trim(),
            street_address: basicMemberData.street_address?.trim(),
            city: basicMemberData.city?.trim(),
            cell_phone: basicMemberData.cell_phone?.trim(),
            oib: basicMemberData.oib?.trim(),
            nickname: basicMemberData.nickname?.trim()
        };

        try {
            const updatedMember = await prisma.$transaction(async (tx) => {
                // 1. Ažuriranje osnovnih podataka o članu
                const memberToUpdate: Partial<MemberUpdateData> = { ...cleanedData };

                if (cleanedData.first_name || cleanedData.last_name) {
                    const currentMember = await tx.member.findUnique({ where: { member_id: memberId } });
                    if (!currentMember) throw new Error("Member not found for update");

                    const firstName = cleanedData.first_name ?? currentMember.first_name;
                    const lastName = cleanedData.last_name ?? currentMember.last_name;
                    memberToUpdate.full_name = `${firstName} ${lastName}`;

                    const membershipDetails = await tx.membershipDetails.findUnique({ where: { member_id: memberId } });
                    if (membershipDetails?.card_number) {
                        const newPassword = `${memberToUpdate.full_name}-isk-${membershipDetails.card_number}`;
                        memberToUpdate.password_hash = await bcrypt.hash(newPassword, 10);
                    }
                }

                console.log('[updateMember] memberToUpdate.functions_in_society neposredno prije update:', memberToUpdate.functions_in_society);
                await tx.member.update({
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
                        hat_size: memberToUpdate.hat_size,
                        membership_type: memberToUpdate.membership_type ? mapMembershipTypeToEnum(memberToUpdate.membership_type) : undefined,
                        other_skills: memberToUpdate.other_skills, // Dodano polje koje je nedostajalo
                        password_hash: memberToUpdate.password_hash,
                        functions_in_society: memberToUpdate.functions_in_society,
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

    async updateMemberRole(req: Request, memberId: number, role: 'member' | 'member_administrator' | 'member_superuser'): Promise<Member> {
        const organizationId = getOrganizationId(req);
        try {
            return await memberRepository.updateRole(organizationId, memberId, role);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error updating member role: ' + errorMessage);
        }
    },

    async getMemberStats(req: Request, memberId: number): Promise<MemberStats> {
        const organizationId = getOrganizationId(req);
        try {
            const stats = await memberRepository.getStats(organizationId, memberId);
            if (!stats) {
                throw new Error('Member stats not found');
            }
            return stats;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error fetching member statistics: ' + errorMessage);
        }
    },



    async createMember(memberData: MemberCreateData & { skills?: { skill_id: number; is_instructor?: boolean }[], other_skills?: string }): Promise<Member> {
        const { skills, other_skills, ...basicMemberData } = memberData;

        // Trim whitespace iz text polja prije spremanja u bazu
        const cleanedData = {
            ...basicMemberData,
            first_name: basicMemberData.first_name?.trim(),
            last_name: basicMemberData.last_name?.trim(),
            email: basicMemberData.email?.trim(),
            street_address: basicMemberData.street_address?.trim(),
            city: basicMemberData.city?.trim(),
            cell_phone: basicMemberData.cell_phone?.trim(),
            oib: basicMemberData.oib?.trim()
        };

        try {
            const newMember = await prisma.$transaction(async (tx) => {
                const registration_completed = !!(
                    cleanedData.first_name &&
                    cleanedData.last_name &&
                    cleanedData.date_of_birth &&
                    cleanedData.gender &&
                    cleanedData.street_address &&
                    cleanedData.city &&
                    cleanedData.oib &&
                    cleanedData.cell_phone &&
                    cleanedData.email &&
                    cleanedData.life_status &&
                    cleanedData.tshirt_size &&
                    cleanedData.shell_jacket_size &&
                    cleanedData.membership_type
                );

                const createdCoreMember = await tx.member.create({
                    data: {
                        first_name: cleanedData.first_name,
                        last_name: cleanedData.last_name,
                        full_name: `${cleanedData.first_name} ${cleanedData.last_name}`,
                        date_of_birth: new Date(cleanedData.date_of_birth),
                        gender: cleanedData.gender,
                        street_address: cleanedData.street_address,
                        city: cleanedData.city,
                        oib: cleanedData.oib,
                        cell_phone: cleanedData.cell_phone,
                        email: cleanedData.email,
                        life_status: cleanedData.life_status,
                        tshirt_size: cleanedData.tshirt_size,
                        shell_jacket_size: cleanedData.shell_jacket_size,
                        hat_size: cleanedData.hat_size,
                        membership_type: mapMembershipTypeToEnum(cleanedData.membership_type),
                        nickname: cleanedData.nickname,
                        other_skills: other_skills,
                        status: 'pending',
                        role: 'member',
                        registration_completed: registration_completed,
                        organization_id: cleanedData.organization_id, // Dodano: koristi organization_id iz requesta
                    },
                });

                // 2. Kreiranje vještina (skills)
                if (skills && Array.isArray(skills) && skills.length > 0) {
                    const skillCreations = skills.map((skill: { skill_id: number, is_instructor: boolean }) => {
                        return tx.memberSkill.create({
                            data: {
                                member_id: createdCoreMember.member_id,
                                skill_id: skill.skill_id,
                                is_instructor: skill.is_instructor || false,
                            },
                        });
                    });
                    await Promise.all(skillCreations);
                }

                // 3. Vrati puni objekt člana nakon kreiranja
                const finalNewMember = await tx.member.findUnique({
                    where: { member_id: createdCoreMember.member_id },
                    include: {
                        membership_details: true,
                        skills: {
                            include: {
                                skill: true,
                            },
                        },
                    },
                });

                if (!finalNewMember) {
                    throw new Error("Failed to fetch new member details after transaction.");
                }

                return finalNewMember as unknown as Member;
            });

            return newMember;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('Error creating member:', errorMessage);
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

    async getMemberWithActivities(req: Request, memberId: number, year?: number): Promise<MemberWithActivities | null> {
        try {
            const member = await this.getMemberById(req, memberId);
            if (!member) return null;

            console.log(`[MEMBER] Dohvaćam aktivnosti za člana ID: ${memberId}`);
            
            let activitiesData = [];
            
            try {
                const participations = await prisma.activityParticipation.findMany({
                    where: {
                        member_id: memberId,
                        ...(year && {
                            activity: {
                                start_date: {
                                    gte: new Date(`${year}-01-01`),
                                    lt: new Date(`${year + 1}-01-01`)
                                }
                            }
                        })
                    },
                    include: {
                        activity: {
                            select: {
                                activity_id: true,
                                name: true,
                                start_date: true,
                                status: true,
                                actual_start_time: true,
                                actual_end_time: true,
                                activity_type: {
                                    select: {
                                        name: true,
                                        custom_label: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        activity: {
                            start_date: 'desc'
                        }
                    }
                });
                
                // Transformiramo Prisma rezultate u očekivani format
                activitiesData = participations.map(p => ({
                    activity_id: p.activity.activity_id,
                    name: p.activity.name,
                    date: p.activity.start_date,
                    status: p.activity.status,
                    manual_hours: p.manual_hours,
                    hours_spent: p.manual_hours || 0,
                    actual_start_time: p.activity.actual_start_time,
                    actual_end_time: p.activity.actual_end_time,
                    activity_type: p.activity.activity_type
                }));
                
                console.log(`[MEMBER] Dohvaćeno ${activitiesData.length} aktivnosti za člana ${memberId}`);
                console.log(`[MEMBER] Prva aktivnost:`, JSON.stringify(activitiesData[0], null, 2));
            } catch (error) {
                console.error(`[MEMBER] Greška prilikom dohvaćanja aktivnosti za člana ${memberId}:`, error);
                throw error;
            }

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
            const activitiesWithHours = activitiesData.map(activity => {
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
                    date: activity.date.toISOString().split('T')[0], // Konvertiraj Date u string format YYYY-MM-DD
                    status: activity.status,
                    hours_spent,
                    activity_type: activity.activity_type
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
	
	async getMemberWithDetails(req: Request, memberId: number): Promise<Member | null> {
        const organizationId = getOrganizationId(req);
        try {
            const member = await memberRepository.findById(organizationId, memberId);
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

    async getMemberAnnualStats(req: Request, memberId: number): Promise<Array<{
        stat_id: number;
        organization_id: number | null;
        member_id: number | null;
        year: number;
        total_hours: number; // Changed from Decimal to number
        total_activities: number;
        membership_status: string;
        calculated_at: string; // Changed from Date to string
    }>> {
        try {
            // MULTI-TENANCY: Dohvati organization_id iz tenant middleware-a
            const organizationId = getOrganizationId(req);
            if (!organizationId) {
                throw new Error('Organization ID is required');
            }
            
            // 1. Dohvati sve participacije za člana s aktivnostima (MULTI-TENANCY)
            // NAPOMENA: Ne koristimo keširane podatke iz annual_statistics tablice
            // jer mogu biti zastarjeli. Uvijek izračunavamo svježe podatke.
            console.log(`[ANNUAL-STATS] Tražim participacije za member_id=${memberId}, org_id=${organizationId}, SVE aktivnosti`);
            
            // Prvo dohvati SVE participacije bez org_id filtera da vidimo što postoji
            const allParticipations = await prisma.activityParticipation.findMany({
                where: { 
                    member_id: memberId
                },
                include: { 
                    activity: true 
                }
            });
            console.log(`[ANNUAL-STATS] TOTAL participations for member ${memberId} (no org filter):`, allParticipations.length);
            console.log(`[ANNUAL-STATS] All participations:`, allParticipations.map(p => ({
                participation_id: p.participation_id,
                activity_id: p.activity_id,
                participation_org_id: p.organization_id,
                activity_org_id: p.activity.organization_id,
                year: new Date(p.activity.start_date).getFullYear() // OK - samo za logging
            })));
            
            const participations = await prisma.activityParticipation.findMany({
                where: { 
                    member_id: memberId,
                    organization_id: organizationId, // MULTI-TENANCY: Filter by organization
                    activity: {
                        organization_id: organizationId // MULTI-TENANCY: Also filter activity by organization
                        // Prikazujemo SVE aktivnosti (PLANNED, ACTIVE, COMPLETED, CANCELLED)
                    }
                },
                include: { 
                    activity: {
                        include: {
                            activity_type: true // Trebamo activity_type da provjerimo je li IZLETI
                        }
                    }
                }
            });
            console.log(`[ANNUAL-STATS] Member ${memberId}, Org ${organizationId}: Found ${participations.length} participations`);
            console.log(`[ANNUAL-STATS] Participations:`, participations.map(p => ({ 
                activity_id: p.activity.activity_id, 
                name: p.activity.name, 
                status: p.activity.status,
                start_date: p.activity.start_date,
                year: new Date(p.activity.start_date).getFullYear(), // OK - samo za logging
                manual_hours: p.manual_hours 
            })));
            
            // 3. Grupiraj participacije po godinama
            const yearlyParticipations = new Map<number, typeof participations>();
            participations.forEach(p => {
                // Koristi stvarni datum iz baze (ne mock) jer je start_date već zapisan
                const year = new Date(p.activity.start_date).getFullYear();
                console.log(`[ANNUAL-STATS] Processing participation: activity_id=${p.activity.activity_id}, year=${year}`);
                if (!yearlyParticipations.has(year)) {
                    yearlyParticipations.set(year, []);
                }
                yearlyParticipations.get(year)!.push(p);
            });
            
            console.log(`[ANNUAL-STATS] Grouped years:`, Array.from(yearlyParticipations.keys()));
            console.log(`[ANNUAL-STATS] Participations per year:`, Array.from(yearlyParticipations.entries()).map(([year, parts]) => ({ year, count: parts.length })));
            
            // Dohvati role recognition settings za organizaciju
            const roleRecognitionSettings = await getRoleRecognitionSettings(organizationId);
            
            // 4. Izračunaj statistike za sve godine
            const allStats: Array<{
                stat_id: number;
                organization_id: number | null;
                member_id: number | null;
                year: number;
                total_hours: Prisma.Decimal;
                total_activities: number;
                membership_status: string;
                calculated_at: Date | null;
            }> = [];
            
            for (const [year, yearParticipations] of yearlyParticipations) {
                    // Izračunaj statistike za tu godinu koristeći istu logiku kao updateAnnualStatistics
                    const totalActivities = yearParticipations.length;
                    
                    const totalHours = yearParticipations.reduce((acc, p) => {
                        let minuteValue = 0;
                        
                        // Prioritet: individualni manual_hours > activity manual_hours > actual times
                        if (p.manual_hours !== null && p.manual_hours !== undefined) {
                            // Individualni override sudionika ima najviši prioritet
                            minuteValue = Math.round(p.manual_hours * 60);
                        } else if (p.activity.manual_hours !== null && p.activity.manual_hours !== undefined && p.activity.manual_hours > 0) {
                            // Ručno uneseni sati na razini aktivnosti
                            minuteValue = p.activity.manual_hours * 60;
                        } else if (p.activity.actual_start_time && p.activity.actual_end_time) {
                            // Automatski izračun iz stvarnog vremena
                            const minutes = differenceInMinutes(
                                new Date(p.activity.actual_end_time),
                                new Date(p.activity.actual_start_time)
                            );
                            minuteValue = minutes > 0 ? minutes : 0;
                        }
                        
                        // Primijeni recognition_override ili activity recognition_percentage
                        const finalRecognitionPercentage = p.recognition_override ?? p.activity.recognition_percentage ?? 100;
                        let recognizedMinutes = minuteValue * (finalRecognitionPercentage / 100);
                        
                        // Primijeni role-based recognition percentage SAMO za IZLETI
                        const isExcursion = p.activity.activity_type?.key === 'izleti';
                        if (isExcursion) {
                            const rolePercentage = getRoleRecognitionPercentage(roleRecognitionSettings, p.participant_role);
                            recognizedMinutes = recognizedMinutes * (rolePercentage / 100);
                        }
                        
                        return acc + recognizedMinutes;
                    }, 0) / 60; // Pretvaramo u sate
                    
                    // Dodaj izračunatu statistiku
                    allStats.push({
                        stat_id: 0, // Privremeni ID za izračunate statistike
                        organization_id: organizationId,
                        member_id: memberId,
                        year: year,
                        total_hours: new Prisma.Decimal(totalHours),
                        total_activities: totalActivities,
                        membership_status: 'calculated', // Status za izračunate statistike
                        calculated_at: new Date()
                    });
            }
            
            // 5. Sortiraj po godini, najnovije prvo
            const sortedStats = allStats.sort((a, b) => b.year - a.year);
            
            // 6. Serialize Decimal and Date objects for proper JSON response
            return sortedStats.map(stat => ({
                ...stat,
                total_hours: Number(stat.total_hours), // Convert Prisma Decimal to number
                calculated_at: stat.calculated_at?.toISOString() || new Date().toISOString() // Convert Date to ISO string with null check
            }));
            
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
            const member = await this.getMemberById(req, memberId);
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
                'MEMBERSHIP_FEE_PAYMENT',
                req.user?.id || null, // Koristimo ID iz req.user
                `Membership fee paid for ${paymentYear}`,
                req,
                'success',
                memberId,
                req.user?.performer_type
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
        req: Request,
        memberId: number, 
        cardNumber: string, 
        stampIssued: boolean
    ): Promise<void> {
        try {
            await membershipService.updateCardDetails(req, memberId, cardNumber, stampIssued);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error updating card details: ' + errorMessage);
        }
    },

    async getMemberWithCardDetails(memberId: number) {
        console.log(`[MEMBER] Dohvaćam detalje člana s karticom za ID: ${memberId}`);
        
        try {
            const memberWithCard = await prisma.member.findUnique({
                where: {
                    member_id: memberId
                },
                include: {
                    membership_details: {
                        select: {
                            card_number: true,
                            card_stamp_issued: true,
                            fee_payment_date: true
                        }
                    }
                }
            });
            
            if (!memberWithCard) {
                console.log(`[MEMBER] Član s ID ${memberId} nije pronađen`);
                return { rows: [] };
            }

            const { membership_details: _omit, ...memberWithoutDetails } = memberWithCard as typeof memberWithCard & { membership_details?: unknown };
            const result = {
                ...memberWithoutDetails,
                card_number: memberWithCard.membership_details?.card_number || null,
                card_stamp_issued: memberWithCard.membership_details?.card_stamp_issued || null,
                fee_payment_date: memberWithCard.membership_details?.fee_payment_date || null
            };
            
            console.log(`[MEMBER] Uspješno dohvaćeni detalji člana ${memberId} s karticom`);
            
            return { rows: [result] };
        } catch (error) {
            console.error(`[MEMBER] Greška prilikom dohvaćanja detalja člana ${memberId}:`, error);
            throw error;
        }
    }
};

export default memberService;