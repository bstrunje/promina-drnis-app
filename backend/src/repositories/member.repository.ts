// backend/src/repositories/member.repository.ts
import prisma from '../utils/prisma.js';
import { mapToMember } from '../utils/memberMapper.js';
import { Member, MemberRole, Gender, LifeStatus, MembershipTypeEnum, ClothingSize } from '../shared/types/member.js';
import { MembershipEndReason } from '../shared/types/membership.js';
import { getCurrentDate } from '../utils/dateUtils.js';
import { Prisma } from '@prisma/client';

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
    full_name?: string;
    password_hash?: string;
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
    async findAll(activeOnly = false): Promise<Member[]> {
        const whereClause: Prisma.MemberWhereInput = {};
        if (activeOnly) {
            whereClause.periods = {
                some: {
                    end_date: null,
                },
            };
        }

        // Dohvati sve članove s osnovnim podacima
        const members = await prisma.member.findMany({
            where: whereClause,
            orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
            include: {
                membership_details: true,
                periods: { select: { period_id: true, start_date: true, end_date: true, end_reason: true } }
            }
            // Ne možemo istovremeno koristiti include i select u Prisma upitu
            // total_hours je već dostupan kao osnovno polje na member entitetu
        });

        // Koristimo total_hours direktno iz baze podataka
        return members.map(m => {
            // Konverzija iz Decimal u number
            const totalHours = m.total_hours ? Number(m.total_hours) : 0;
            return mapToMember(m, totalHours);
        });
    },

    async findById(id: number): Promise<Member | null> {
        const raw = await prisma.member.findFirst({
            where: { member_id: id },
            include: { membership_details: true, periods: { select: { period_id: true, start_date: true, end_date: true, end_reason: true } } }
        });
        if (!raw) return null;
        
        // Dohvati aktualnu vrijednost total_hours iz baze
        // Ovo će uvijek biti ažurno jer updateMemberTotalHours ažurira ovo polje
        const member = await prisma.member.findFirst({
            where: { member_id: id },
            select: { total_hours: true }
        });
        
        // Ako postoji vrijednost total_hours u bazi, koristi nju, inače 0
        // Konverzija iz Decimal u number za izbjegavanje TypeScript greške
        const totalMinutes = member?.total_hours ? Number(member.total_hours) : 0;
        
        return mapToMember(raw, totalMinutes);
    },

    async update(memberId: number, memberData: MemberUpdateData): Promise<Member> {
        const raw = await prisma.member.update({ where: { member_id: memberId }, data: {
            first_name: memberData.first_name,
            last_name: memberData.last_name,
            full_name: memberData.full_name,
            password_hash: memberData.password_hash,
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
        const totalActivities = await prisma.activityParticipation.count({
            where: { 
                member_id: memberId,
                activity: { status: 'COMPLETED' } 
            }
        });
        const agg = await prisma.activityParticipation.aggregate({
            where: { 
                member_id: memberId,
                activity: { status: 'COMPLETED' } 
            },
            _sum: { manual_hours: true }
        });
        const member = await prisma.member.findUnique({
            where: { member_id: memberId },
            select: { membership_type: true }
        });
        if (!member) throw new Error('Member not found');
        const totalHours = agg._sum?.manual_hours ?? 0;
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
    },

    async findMemberIdsByRoles(roles: string[]): Promise<number[]> {
        const members = await prisma.member.findMany({
            where: {
                role: { in: roles },
                status: 'registered', // Dodajemo provjeru da su članovi aktivni
            },
            select: { member_id: true },
        });
        return members.map(m => m.member_id);
    },

    async findAllActiveMemberIds(excludeSenderId?: number): Promise<number[]> {
        const members = await prisma.member.findMany({
            where: {
                status: 'registered',
                NOT: {
                    member_id: excludeSenderId,
                },
            },
            select: { member_id: true },
        });
        return members.map(m => m.member_id);
    },

    async updateWorkHours(memberId: number, hours: number, prismaClient: Prisma.TransactionClient = prisma) {
        return prismaClient.member.update({
            where: { member_id: memberId },
            data: {
                total_hours: {
                    increment: hours
                }
            }
        });
    },

    async getAnnualStats(memberId: number) {
        return prisma.annualStatistics.findMany({
            where: { member_id: memberId },
            orderBy: { year: 'desc' },
        });
    },
};

export default memberRepository;