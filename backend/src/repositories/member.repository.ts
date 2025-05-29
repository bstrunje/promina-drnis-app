// backend/src/repositories/member.repository.ts
import prisma from '../utils/prisma.js';
import { mapToMember } from '../utils/memberMapper.js';
import { Member, MemberRole, Gender, LifeStatus, MembershipTypeEnum, ClothingSize } from '../shared/types/member.js';
import { MembershipEndReason } from '../shared/types/membership.js';
import { getCurrentDate } from '../utils/dateUtils.js';

// Interfaces for data operations
import { mapMembershipTypeToEnum } from '../services/member.service.js';

export interface MemberCreateData extends Omit<Member, 'member_id' | 'status' | 'role' | 'total_hours' | 'last_login' | 'password_hash' | 'full_name'> {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: Gender;
    street_address: string;
    city: string;
    oib: string;
    cell_phone: string;
    email: string;
    life_status: Member['life_status'];
    tshirt_size: Member['tshirt_size'];
    shell_jacket_size: Member['shell_jacket_size'];
    membership_type: Member['membership_type'];
    nickname?: string;
}

export interface MemberUpdateData extends Partial<Omit<Member, 'member_id' | 'status' | 'role'>> {
    first_name?: string;
    last_name?: string;
    date_of_birth?: string;
    gender?: Gender;
    street_address?: string;
    city?: string;
    oib?: string;
    cell_phone?: string;
    email?: string;
    life_status?: Member['life_status'];
    tshirt_size?: Member['tshirt_size'];
    shell_jacket_size?: Member['shell_jacket_size'];
    total_hours?: number;
    membership_type?: Member['membership_type'];
    nickname?: string;
}

export interface MemberStats {
    total_activities: number;
    total_hours: number;
    membership_type: Member['membership_type'];
    activity_status: 'active' | 'passive';
}

const memberRepository = {
    async findAll(): Promise<Member[]> {
        const members = await prisma.member.findMany({
            orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
            include: {
                membership_details: true,
                periods: { select: { period_id: true, start_date: true, end_date: true, end_reason: true } }
            }
        });
        const hours = await prisma.activityParticipant.groupBy({
            by: ['member_id'], where: { verified_at: { not: null } }, _sum: { hours_spent: true }
        });
        const mapHours = new Map(hours.map(h => [h.member_id!, h._sum.hours_spent?.toNumber() || 0]));
        return members.map(m => mapToMember(m, mapHours.get(m.member_id) || 0));
    },

    async findById(id: number): Promise<Member | null> {
        const raw = await prisma.member.findFirst({
            where: { member_id: id },
            include: { membership_details: true, periods: { select: { period_id: true, start_date: true, end_date: true, end_reason: true } } }
        });
        if (!raw) return null;
        const agg = await prisma.activityParticipant.aggregate({ where: { member_id: id, verified_at: { not: null } }, _sum: { hours_spent: true } });
        const total = agg._sum.hours_spent?.toNumber() || 0;
        return mapToMember(raw, total);
    },

    async update(memberId: number, memberData: MemberUpdateData): Promise<Member> {
        const raw = await prisma.member.update({ where: { member_id: memberId }, data: {
            first_name: memberData.first_name,
            last_name: memberData.last_name,
            date_of_birth: memberData.date_of_birth,
            gender: memberData.gender,
            street_address: memberData.street_address,
            city: memberData.city,
            oib: memberData.oib,
            cell_phone: memberData.cell_phone,
            email: memberData.email,
            life_status: memberData.life_status,
            tshirt_size: memberData.tshirt_size,
            shell_jacket_size: memberData.shell_jacket_size,
            total_hours: memberData.total_hours,
            membership_type: memberData.membership_type !== undefined ? mapMembershipTypeToEnum(memberData.membership_type) : undefined,
            nickname: memberData.nickname
        } });
        return mapToMember(raw);
    },

    async create(memberData: MemberCreateData): Promise<Member> {
        const raw = await prisma.member.create({ data: {
            first_name: memberData.first_name,
            last_name: memberData.last_name,
            full_name: `${memberData.first_name} ${memberData.last_name}`, // Puno ime je obavezno polje
            date_of_birth: memberData.date_of_birth,
            gender: memberData.gender,
            street_address: memberData.street_address,
            city: memberData.city,
            oib: memberData.oib,
            cell_phone: memberData.cell_phone,
            email: memberData.email,
            life_status: memberData.life_status,
            tshirt_size: memberData.tshirt_size,
            shell_jacket_size: memberData.shell_jacket_size,
            status: 'pending',
            role: 'member',
            membership_type: mapMembershipTypeToEnum(memberData.membership_type),
            nickname: memberData.nickname
        } });
        return mapToMember(raw);
    },

    async getStats(memberId: number): Promise<MemberStats> {
        // count total activities and sum hours for member
        const totalActivities = await prisma.activityParticipant.count({
            where: { member_id: memberId }
        });
        const agg = await prisma.activityParticipant.aggregate({
            where: { member_id: memberId, verified_at: { not: null } },
            _sum: { hours_spent: true }
        });
        const member = await prisma.member.findUnique({
            where: { member_id: memberId },
            select: { membership_type: true }
        });
        if (!member) throw new Error('Member not found');
        const totalHours = agg._sum.hours_spent?.toNumber() || 0;
        return {
            total_activities: totalActivities,
            total_hours: totalHours,
            membership_type: member.membership_type as MembershipTypeEnum,
            activity_status: totalHours >= 20 ? 'active' : 'passive'
        };
    },

    async updateProfileImage(memberId: number, imagePath: string): Promise<void> {
        await prisma.member.update({
            where: { member_id: memberId },
            data: {
                profile_image_path: imagePath,
                profile_image_updated_at: getCurrentDate()
            }
        });
    },
    
    async getProfileImage(memberId: number): Promise<string | null> {
        const result = await prisma.member.findFirst({
            where: { member_id: memberId },
            select: { profile_image_path: true }
        });
        return result?.profile_image_path || null;
    },

    async delete(memberId: number): Promise<Member> {
        // delete related entities first to maintain referential integrity
        await prisma.membershipDetails.deleteMany({ where: { member_id: memberId } });
        await prisma.membershipPeriod.deleteMany({ where: { member_id: memberId } });
        await prisma.activityParticipant.deleteMany({ where: { member_id: memberId } });
        await prisma.memberMessage.deleteMany({ where: { member_id: memberId } });
        await prisma.annualStatistics.deleteMany({ where: { member_id: memberId } });
        const raw = await prisma.member.delete({ where: { member_id: memberId } });
        return mapToMember(raw);
    },

    async updateRole(memberId: number, role: 'member' | 'member_administrator' | 'member_superuser'): Promise<Member> {
        const raw = await prisma.member.update({ where: { member_id: memberId }, data: { role } });
        return mapToMember(raw);
    },

    async updatePassword(memberId: number, password: string): Promise<void> {
        await prisma.member.update({
            where: { member_id: memberId },
            data: { password_hash: password }
        });
    },

    async findByRole(role: string): Promise<Member[]> {
        // reuse findAll and filter by role for Prisma consistency
        const all = await this.findAll();
        return all.filter(member => member.role === role);
    }
};

export default memberRepository;