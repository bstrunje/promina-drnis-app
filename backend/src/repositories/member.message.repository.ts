import prisma from '../utils/prisma.js';
import { getCurrentDate } from '../utils/dateUtils.js';
import { MemberMessage as PrismaMemberMessage, Prisma } from '@prisma/client'; // Importing Member type and Prisma types
import memberRepository from './member.repository.js';

export interface TransformedMessage {
    /**
     * Lista članova koji su pročitali poruku (za admin prikaz)
     * Svaki objekt sadrži member_id i read_at (ako je pročitao)
     */
    read_by?: Array<{ member_id: number, read_at: Date | null, full_name: string | null }>;

    message_id: number;
    member_id: number | null;
    message_text: string;
    created_at: Date | null; // Dopuštamo null vrijednost za created_at
    sender_id: number | null;
    recipient_id: number | null;
    recipient_type: PrismaMemberMessage['recipient_type'];
    sender_type: PrismaMemberMessage['sender_type'];
    currentUserStatus?: 'unread' | 'read' | 'archived';
    currentUserReadAt?: Date | null;
    sender?: {
        member_id: number;
        first_name: string | null;
        last_name: string | null;
        full_name: string | null;
    } | null;
}

// Using shared prisma client

const memberMessageRepository = {
    async findById(messageId: number): Promise<PrismaMemberMessage | null> {
        // mapToMemberMessage će biti uklonjen ili refaktoriran
        // Direktno vraćanje raw objekta ili prilagođeno mapiranje kasnije
        return prisma.memberMessage.findUnique({
            where: { message_id: messageId },
        });
    },

    async create(memberId: number, messageText: string): Promise<TransformedMessage> {
        // 1. Kreiraj osnovnu poruku
        const newMessage = await prisma.memberMessage.create({
            data: {
                message_text: messageText,
                sender_id: memberId,
                sender_type: 'member',
                recipient_type: 'member_administrator', // Poruka je namijenjena ulozi administratora
                member_id: memberId, // Održavamo ovo polje kao u staroj logici, povezuje s MemberMessage.member
            },
        });

        // 2. Dohvati sve administratore i superusere
        const adminAndSuperUserRoles = ['member_administrator', 'member_superuser'];
        const recipientMemberIds = await memberRepository.findMemberIdsByRoles(adminAndSuperUserRoles);
        
        // 3. Kreiraj MessageRecipientStatus za svakog primatelja
        if (recipientMemberIds.length > 0) {
            const recipientStatusData = recipientMemberIds.map(adminId => ({
                message_id: newMessage.message_id,
                recipient_member_id: adminId,
                status: 'unread', // Inicijalno nepročitano
            }));
            await prisma.messageRecipientStatus.createMany({
                data: recipientStatusData,
            });
        }
        // Transformiraj poruku u TransformedMessage format s currentUserStatus i currentUserReadAt poljima
        const transformedMessage: TransformedMessage = {
            ...newMessage,
            currentUserStatus: 'unread',
            currentUserReadAt: null,
            sender: null // Možemo dodati podatke o pošiljatelju ako je potrebno
        };
        
        return transformedMessage;
    },

    async createAdminMessage({
        senderId,
        messageText,
        recipientType = 'member',
        senderType = 'member_administrator',
        recipientId, // Koristi se samo ako je recipientType 'member'
        recipientMemberIds: inputRecipientMemberIds, // Koristi se samo ako je recipientType 'group'
    }: {
        senderId: number;
        messageText: string;
        recipientType?: 'member' | 'group' | 'all';
        senderType?: 'member_administrator' | 'member_superuser';
        recipientId?: number;
        recipientMemberIds?: number[];
    }): Promise<TransformedMessage> {
        const newMessage = await prisma.memberMessage.create({
            data: {
                message_text: messageText,
                sender_id: senderId,
                sender_type: senderType,
                recipient_id: recipientType === 'member' ? recipientId : null, // recipient_id je ID člana za 'member', inače null
                recipient_type: recipientType,
            },
        });

        let finalRecipientIds: number[] = [];

        if (recipientType === 'all') {
            const allMembers = await memberRepository.findAllReceivableMemberIds(senderId);
            finalRecipientIds = allMembers;
        } else if (recipientType === 'group') {
            if (!inputRecipientMemberIds || inputRecipientMemberIds.length === 0) {
                throw new Error('Za grupnu poruku potrebno je navesti primatelje.');
            }
            finalRecipientIds = inputRecipientMemberIds.filter(id => id !== senderId);
        } else if (recipientType === 'member' && recipientId) {
            finalRecipientIds = [recipientId];
        } else {
            throw new Error('Nevažeći tip primatelja ili nedostaju ID-evi primatelja.');
        }

        if (finalRecipientIds.length > 0) {
            const recipientStatusData = finalRecipientIds.map(memberId => ({
                message_id: newMessage.message_id,
                recipient_member_id: memberId,
                status: 'unread', // Inicijalno nepročitano
            }));
            await prisma.messageRecipientStatus.createMany({
                data: recipientStatusData,
                skipDuplicates: true, // Ignoriraj duplikate ako postoje
            });
        }

        // Transformiraj poruku u TransformedMessage format
        const transformedMessage: TransformedMessage = {
            ...newMessage,
            currentUserStatus: 'unread',
            currentUserReadAt: null,
            sender: null // Možemo dodati podatke o pošiljatelju ako je potrebno
        };
        
        return transformedMessage;
    },

    async getAllForAdmin(currentMemberId: number): Promise<TransformedMessage[]> {
        const messagesData = await prisma.memberMessage.findMany({
            where: {
                // Dohvati poruke za koje postoji status za trenutnog korisnika
                recipient_statuses: {
                    some: {
                        recipient_member_id: currentMemberId,
                        // Opcionalno: filtriraj da se ne prikazuju arhivirane poruke ovdje
                        // status: { not: 'archived' }
                    },
                },
            },
            include: {
                sender: { // Podaci o pošiljatelju
                    select: { member_id: true, first_name: true, last_name: true, full_name: true },
                },
                recipient_statuses: { // Statusi za trenutnog korisnika
                    where: { recipient_member_id: currentMemberId },
                    select: { status: true, read_at: true },
                },
                // Opcionalno: ako želimo znati sve primatelje poruke (npr. za prikaz 'All Members' ili liste grupe)
                // _count: { select: { recipient_statuses: true } } // Ukupan broj primatelja ove poruke
            },
            orderBy: { created_at: 'desc' },
        });

        // Definiranje tipa za payload s uključenim relacijama
        // Definiranje tipa za payload s uključenim relacijama
        const _messageWithDetailsPayload = Prisma.validator<Prisma.MemberMessageDefaultArgs>()({
          include: {
            sender: { select: { member_id: true, first_name: true, last_name: true, full_name: true } },
            recipient_statuses: { 
              where: { recipient_member_id: currentMemberId }, // Osiguravamo da je where ovdje
              select: { status: true, read_at: true }
            },
          },
        });
        type MessageWithDetails = Prisma.MemberMessageGetPayload<typeof _messageWithDetailsPayload>;

        // Mapiranje rezultata
        return (messagesData as MessageWithDetails[]).map((msg): TransformedMessage => {
            const recipientStatus = msg.recipient_statuses[0]; // Trebao bi biti samo jedan za currentMemberId
            return {
                message_id: msg.message_id,
                member_id: msg.member_id, // Originalno polje, ako se koristi
                message_text: msg.message_text,
                created_at: msg.created_at,
                sender_id: msg.sender_id,
                recipient_id: msg.recipient_id,
                recipient_type: msg.recipient_type,
                sender_type: msg.sender_type,
                currentUserStatus: recipientStatus?.status as ('unread' | 'read' | 'archived' | undefined),
                currentUserReadAt: recipientStatus?.read_at,
                sender: msg.sender ? {
                    member_id: msg.sender.member_id,
                    first_name: msg.sender.first_name,
                    last_name: msg.sender.last_name,
                    full_name: msg.sender.full_name
                } : null,
            };
        });
    },

    async getByMemberId(memberId: number): Promise<TransformedMessage[]> {
        // memberId je ovdje isto što i currentMemberId za kojeg dohvaćamo poruke
        const messageWithDetailsPayload = Prisma.validator<Prisma.MemberMessageDefaultArgs>()({
          include: {
            sender: { select: { member_id: true, first_name: true, last_name: true, full_name: true } },
            recipient_statuses: { 
              select: { status: true, read_at: true, recipient_member_id: true } 
            },
          },
        });
        type MessageWithDetails = Prisma.MemberMessageGetPayload<typeof messageWithDetailsPayload>;

        const messagesData = await prisma.memberMessage.findMany({
            where: {
                recipient_statuses: {
                    some: {
                        recipient_member_id: memberId,
                        // status: { not: 'archived' } // Opcionalno, ako ne želimo arhivirane
                    },
                },
            },
            include: {
                sender: messageWithDetailsPayload.include.sender,
                recipient_statuses: {
                    where: { recipient_member_id: memberId },
                    select: messageWithDetailsPayload.include.recipient_statuses.select
                }
            },
            orderBy: { created_at: 'desc' },
        });

        return (messagesData as MessageWithDetails[]).map((msg): TransformedMessage => {
            const recipientStatus = msg.recipient_statuses[0]; 
            return {
                message_id: msg.message_id,
                member_id: msg.member_id, 
                message_text: msg.message_text,
                created_at: msg.created_at, 
                sender_id: msg.sender_id,
                recipient_id: msg.recipient_id,
                recipient_type: msg.recipient_type, 
                sender_type: msg.sender_type, 
                currentUserStatus: recipientStatus?.status as ('unread' | 'read' | 'archived' | undefined),
                currentUserReadAt: recipientStatus?.read_at, 
                sender: msg.sender ? {
                    member_id: msg.sender.member_id,
                    first_name: msg.sender.first_name,
                    last_name: msg.sender.last_name,
                    full_name: msg.sender.full_name
                } : null,
            };
        });
    },

    async getMessagesSentByAdmin(adminId: number): Promise<TransformedMessage[]> {
        const messageWithDetailsPayload = Prisma.validator<Prisma.MemberMessageDefaultArgs>()({
          include: {
            sender: { select: { member_id: true, first_name: true, last_name: true, full_name: true } },
            recipient_statuses: { 
            select: { 
              status: true, 
              read_at: true, 
              recipient_member_id: true,
              member: { select: { full_name: true } } // Dodano za dohvaćanje imena primatelja
            } 
          } // Uključujemo radi sukladnosti s TransformedMessage
          },
        });
        type MessageWithDetails = Prisma.MemberMessageGetPayload<typeof messageWithDetailsPayload>;

        const messagesData = await prisma.memberMessage.findMany({
            where: {
                sender_id: adminId,
                sender_type: { in: ['member_administrator', 'member_superuser'] },
            },
            include: messageWithDetailsPayload.include,
            orderBy: { created_at: 'desc' },
        });

        return (messagesData as MessageWithDetails[]).map((msg): TransformedMessage => {
            // Za poslane poruke, currentUserStatus i currentUserReadAt nisu direktno primjenjivi
            // na isti način kao za primljene. Ostavljamo ih kao undefined ili ih možemo izostaviti
            // ako TransformedMessage sučelje to dopušta (opcionalni su).
            return {
                message_id: msg.message_id,
                read_by: (msg.recipient_statuses || []).map(rs => ({
                    member_id: rs.recipient_member_id,
                    read_at: rs.read_at,
                    full_name: rs.member?.full_name || null // Dodano ime primatelja
                })),
                member_id: msg.member_id,
                message_text: msg.message_text,
                created_at: msg.created_at,
                sender_id: msg.sender_id,
                recipient_id: msg.recipient_id,
                recipient_type: msg.recipient_type,
                sender_type: msg.sender_type,
                currentUserStatus: undefined, // Nije relevantno za poslane poruke na ovaj način
                currentUserReadAt: undefined, // Nije relevantno za poslane poruke na ovaj način
                sender: msg.sender ? {
                    member_id: msg.sender.member_id,
                    first_name: msg.sender.first_name,
                    last_name: msg.sender.last_name,
                    full_name: msg.sender.full_name
                } : null,
                // recipient_statuses: msg.recipient_statuses // Može se dodati ako je potrebno prikazati statuse svih primatelja
            };
        });
    },

    async getSentMessagesByMemberId(memberId: number): Promise<TransformedMessage[]> {
        const messageWithDetailsPayload = Prisma.validator<Prisma.MemberMessageDefaultArgs>()({
          include: {
            sender: { select: { member_id: true, first_name: true, last_name: true, full_name: true } },
            recipient_statuses: { 
              select: { status: true, read_at: true, recipient_member_id: true }
            },
          },
        });
        type MessageWithDetails = Prisma.MemberMessageGetPayload<typeof messageWithDetailsPayload>;

        const messagesData = await prisma.memberMessage.findMany({
            where: {
                sender_id: memberId,
            },
            include: messageWithDetailsPayload.include,
            orderBy: { created_at: 'desc' },
        });

        return (messagesData as MessageWithDetails[]).map((msg): TransformedMessage => {
            // Pronađi status za trenutnog korisnika (pošiljatelja)
            const currentUserStatus = msg.recipient_statuses.find(rs => rs.recipient_member_id === memberId);

            return {
                message_id: msg.message_id,
                member_id: msg.member_id,
                message_text: msg.message_text,
                created_at: msg.created_at,
                sender_id: msg.sender_id,
                recipient_id: msg.recipient_id,
                recipient_type: msg.recipient_type,
                sender_type: msg.sender_type,
                currentUserStatus: currentUserStatus ? currentUserStatus.status as ('unread' | 'read' | 'archived' | undefined) : undefined,
                currentUserReadAt: currentUserStatus ? currentUserStatus.read_at : undefined,
                sender: msg.sender,
            };
        });
    },

    async getAdHocGroupMessagesForMember(currentMemberId: number): Promise<TransformedMessage[]> {
        const messageWithDetailsPayload = Prisma.validator<Prisma.MemberMessageDefaultArgs>()({
          include: {
            sender: { select: { member_id: true, first_name: true, last_name: true, full_name: true } },
            recipient_statuses: { 
              select: { status: true, read_at: true, recipient_member_id: true }
            },
          },
        });
        type MessageWithDetails = Prisma.MemberMessageGetPayload<typeof messageWithDetailsPayload>;

        const messagesData = await prisma.memberMessage.findMany({
            where: {
                recipient_type: 'group',
                // recipient_id bi trebao biti null za ad-hoc grupne poruke, pa ga ne filtriramo ovdje
                recipient_statuses: {
                    some: {
                        recipient_member_id: currentMemberId,
                        // status: { not: 'archived' } // Opcionalno, ako želimo izuzeti arhivirane
                    },
                },
            },
            include: {
                sender: messageWithDetailsPayload.include.sender,
                recipient_statuses: {
                    where: { recipient_member_id: currentMemberId },
                    select: messageWithDetailsPayload.include.recipient_statuses.select
                }
            },
            orderBy: { created_at: 'desc' },
        });

        return (messagesData as MessageWithDetails[]).map((msg): TransformedMessage => {
            const recipientStatus = msg.recipient_statuses.find(rs => rs.recipient_member_id === currentMemberId) || msg.recipient_statuses[0];
            return {
                message_id: msg.message_id,
                member_id: msg.member_id,
                message_text: msg.message_text,
                created_at: msg.created_at,
                sender_id: msg.sender_id,
                recipient_id: msg.recipient_id,
                recipient_type: msg.recipient_type,
                sender_type: msg.sender_type,
                currentUserStatus: recipientStatus?.status as ('unread' | 'read' | 'archived' | undefined),
                currentUserReadAt: recipientStatus?.read_at,
                sender: msg.sender ? {
                    member_id: msg.sender.member_id,
                    first_name: msg.sender.first_name,
                    last_name: msg.sender.last_name,
                    full_name: msg.sender.full_name
                } : null,
            };
        });
    },

    async getMessagesForAllMembers(currentMemberId: number): Promise<TransformedMessage[]> {
        const messageWithDetailsPayload = Prisma.validator<Prisma.MemberMessageDefaultArgs>()({
          include: {
            sender: { select: { member_id: true, first_name: true, last_name: true, full_name: true } },
            recipient_statuses: { 
              select: { status: true, read_at: true, recipient_member_id: true }
            },
          },
        });
        type MessageWithDetails = Prisma.MemberMessageGetPayload<typeof messageWithDetailsPayload>;

        const messagesData = await prisma.memberMessage.findMany({
            where: {
                recipient_type: 'all',
                recipient_statuses: {
                    some: {
                        recipient_member_id: currentMemberId,
                        // status: { not: 'archived' } // Opcionalno
                    },
                },
            },
            include: {
                sender: messageWithDetailsPayload.include.sender,
                recipient_statuses: {
                    where: { recipient_member_id: currentMemberId }, // Status samo za ovog člana
                    select: messageWithDetailsPayload.include.recipient_statuses.select
                }
            },
            orderBy: { created_at: 'desc' },
        });

        return (messagesData as MessageWithDetails[]).map((msg): TransformedMessage => {
            const recipientStatus = msg.recipient_statuses.find(rs => rs.recipient_member_id === currentMemberId) || msg.recipient_statuses[0];
            return {
                message_id: msg.message_id,
                member_id: msg.member_id,
                message_text: msg.message_text,
                created_at: msg.created_at,
                sender_id: msg.sender_id,
                recipient_id: msg.recipient_id,
                recipient_type: msg.recipient_type,
                sender_type: msg.sender_type,
                currentUserStatus: recipientStatus?.status as ('unread' | 'read' | 'archived' | undefined),
                currentUserReadAt: recipientStatus?.read_at,
                sender: msg.sender ? {
                    member_id: msg.sender.member_id,
                    first_name: msg.sender.first_name,
                    last_name: msg.sender.last_name,
                    full_name: msg.sender.full_name
                } : null,
            };
        });
    },

    async markAsRead(messageId: number, memberId: number): Promise<void> {
        await prisma.messageRecipientStatus.updateMany({
            where: {
                message_id: messageId,
                recipient_member_id: memberId,
            },
            data: {
                status: 'read',
                read_at: getCurrentDate(),
            },
        });
    },

    async archiveMessage(messageId: number, memberId: number): Promise<void> {
        await prisma.messageRecipientStatus.updateMany({
            where: {
                message_id: messageId,
                recipient_member_id: memberId,
            },
            data: {
                status: 'archived',
                // Možda ne želimo postaviti read_at za arhiviranje, ovisno o logici
            },
        });
    },

    async deleteMessage(messageId: number): Promise<void> {
        // Prvo obriši povezane statuse primatelja da se izbjegnu problemi s referencijalnim integritetom
        await prisma.messageRecipientStatus.deleteMany({
            where: { message_id: messageId },
        });
        await prisma.memberMessage.delete({ where: { message_id: messageId }});
    },

    async deleteAllMessages(): Promise<void> {
        await prisma.messageRecipientStatus.deleteMany({}); // Obriši sve statuse
        await prisma.memberMessage.deleteMany({}); // Zatim obriši sve poruke
    },

    async messageExists(messageId: number): Promise<boolean> {
        const count = await prisma.memberMessage.count({ where: { message_id: messageId }});
        return count > 0;
    },

    // OPTIMIZIRANA funkcija za brojanje nepročitanih poruka - serverless friendly
    async countUnreadMessages(memberId: number): Promise<number> {
        try {
            // Optimiziran upit s minimalnim JOIN-om za serverless performanse
            const count = await prisma.messageRecipientStatus.count({
                where: {
                    recipient_member_id: memberId,
                    status: 'unread',
                    // Optimiziran pristup - direktno isključujemo self-sent poruke
                    message: {
                        sender_id: { not: memberId }
                    }
                },
            });
            return count;
        } catch (error) {
            console.error('Error counting unread messages for member', memberId, ':', error);
            return 0; // Fallback vrijednost umjesto error-a
        }
    }
};

export default memberMessageRepository;