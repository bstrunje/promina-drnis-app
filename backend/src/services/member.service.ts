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
import { getCurrentDate } from '../utils/dateUtils.js';

interface MemberWithActivities extends Member {
    activities?: {
        activity_id: number;
        title: string;
        date: string;
        hours_spent: number;
    }[];
}

export function mapMembershipTypeToEnum(value: any): MembershipTypeEnum {
  if (typeof value === 'string') {
    if (value === 'regular') return MembershipTypeEnum.Regular;
    if (value === 'supporting') return MembershipTypeEnum.Supporting;
    if (value === 'honorary') return MembershipTypeEnum.Honorary;
  }
  return value as MembershipTypeEnum;
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
            const member = await memberRepository.findById(memberId);
            if (!member) {
                return null;
            }
            return member;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error fetching member: ' + errorMessage);
        }
    },

    async updateMember(memberId: number, memberData: MemberUpdateData): Promise<Member> {
        try {
            if (memberData.total_hours !== undefined) {
                const currentHours = await db.query(`
                    SELECT COALESCE(SUM(hours_spent), 0) as total_hours
                    FROM activity_participants
                    WHERE member_id = $1 AND verified_at IS NOT NULL
                `, [memberId]);
                
                if (memberData.total_hours < parseFloat(currentHours.rows[0].total_hours)) {
                    throw new Error('Cannot set total hours less than verified activity hours');
                }
            }

            return await memberRepository.update(memberId, {
    ...memberData,
    membership_type: memberData.membership_type !== undefined
      ? mapMembershipTypeToEnum(memberData.membership_type)
      : undefined
  });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
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

    async updatePeriodEndReason(
        memberId: number,
        periodId: number,
        endReason: 'withdrawal' | 'non_payment' | 'expulsion' | 'death'
      ): Promise<void> {
        try {
          const member = await memberRepository.findById(memberId);
          if (!member) throw new Error("Member not found");
      
          // Get the period to ensure it exists and belongs to this member
          const periods = await membershipRepository.getMembershipPeriods(memberId);
          const periodToUpdate = periods.find(p => p.period_id === periodId);
          
          if (!periodToUpdate) {
            throw new Error("Membership period not found");
          }
          
          // Update just the end reason
          await membershipRepository.updatePeriodEndReason(periodId, endReason);
        } catch (error) {
          console.error("Error updating membership period end reason:", error);
          throw error;
        }
      },

    async createMember(memberData: MemberCreateData): Promise<Member> {
        try {
            // Set default values for new members
            const newMemberData: MemberCreateData = {
                ...memberData,
                membership_type: mapMembershipTypeToEnum(memberData.membership_type) || MembershipTypeEnum.Regular
            };
            return await memberRepository.create(newMemberData);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error creating member: ' + errorMessage);
        }
    },

    async deleteMember(memberId: number): Promise<Member | null> {
        return await db.transaction(async (client) => {
            try {
                const member = await memberRepository.findById(memberId);
                if (!member) {
                    throw new Error('Member not found');
                }
                
                // Prvo brisanje povezanih zapisa iz password_update_queue
                await client.query(
                    `DELETE FROM password_update_queue WHERE member_id = $1`,
                    [memberId]
                );
                
                // Nastavak s brisanjem člana
                const deletedMember = await memberRepository.delete(memberId);
                if (!deletedMember) {
                    throw new Error('Failed to delete member');
                }
    
                return deletedMember;
            } catch (error) {
                console.error('Failed to delete member:', error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                throw new DatabaseError(`Failed to delete member: ${errorMessage}`, 500);
            }
        });
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

            const activitiesQuery = await db.query(`
                SELECT 
                    a.activity_id,
                    a.title,
                    a.start_date as date,
                    ap.hours_spent
                FROM activities a
                JOIN activity_participants ap ON a.activity_id = ap.activity_id
                WHERE ap.member_id = $1
                ORDER BY a.start_date DESC
            `, [memberId]);

            return {
                ...member,
                activities: activitiesQuery.rows
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

            // Uvijek složi membership_details property iz podataka koje vraća findById
            const membershipDetails = {
                card_number: (member as any).card_number ?? undefined,
                fee_payment_year: (member as any).fee_payment_year ?? undefined,
                card_stamp_issued: (member as any).card_stamp_issued ?? undefined,
                fee_payment_date: (member as any).fee_payment_date
                    ? new Date((member as any).fee_payment_date).toISOString()
                    : undefined,
                next_year_stamp_issued: (member as any).next_year_stamp_issued ?? undefined,
            };

            return {
                ...member,
                full_name: (member as any).calculated_full_name || member.full_name,
                membership_details: membershipDetails,
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error fetching member with details: ' + errorMessage);
        }
    },

    // Add to existing member service methods
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

    async terminateMembership(
        memberId: number, 
        reason: 'withdrawal' | 'non_payment' | 'expulsion' | 'death', 
        endDate?: Date
    ): Promise<void> {
        try {
            await membershipService.endMembership(memberId, reason, endDate);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error('Error terminating membership: ' + errorMessage);
        }
    },

    async updateMembershipHistory(
        memberId: number,
        periods: MembershipPeriod[]
      ): Promise<void> {
        try {
          const member = await memberRepository.findById(memberId);
          if (!member) throw new Error("Member not found");
      
          await membershipRepository.updateMembershipPeriods(memberId, periods);
        } catch (error) {
          console.error("Error updating membership history:", error);
          throw error;
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