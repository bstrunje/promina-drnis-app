import type { Request, Response } from 'express';
import messageService from '../services/message.service.js';
import auditService from '../services/audit.service.js';
import { SenderType } from '@prisma/client';
import { mapToMemberMessage, mapToMemberMessageWithSender } from '../utils/memberMessageMapper.js';

const messageController = {
    async createMessage(req: Request, res: Response): Promise<void> {
        try {
            const { messageText } = req.body;
            const memberId = parseInt(req.params.memberId);

            const message = await messageService.createMessage(memberId, messageText);
            
            if (req.user?.id) {
                await auditService.logAction(
                    'CREATE_MESSAGE',
                    req.user.id,
                    `Message created by member ${memberId}`,
                    req,
                    'success',
                    undefined,
                    req.user.performer_type
                );
            }

            // Mapiramo poruku za frontend
            const mappedMessage = mapToMemberMessage(message);
            res.status(201).json(mappedMessage);
        } catch (error) {
            console.error('Error creating message:', error);
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Failed to create message' 
            });
        }
    },
    
    async sendMessageToMember(req: Request, res: Response): Promise<void> {
        try {
            const { messageText } = req.body;
            const recipientId = parseInt(req.params.memberId);
            const senderId = req.user?.id;
            
            if (!senderId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const senderType = req.user?.role_name === 'member_superuser' ? SenderType.member_superuser : SenderType.member_administrator;
            const message = await messageService.createAdminMessage({
                senderId,
                recipientId,
                messageText,
                recipientType: 'member',
                senderType
            });
            
            await auditService.logAction(
                'ADMIN_SEND_MESSAGE',
                senderId,
                `Admin sent message to member ${recipientId}`,
                req,
                'success',
                recipientId,
                req.user?.performer_type
            );

            // Mapiramo poruku za frontend
            const mappedMessage = mapToMemberMessage(message);
            res.status(201).json(mappedMessage);
        } catch (error) {
            console.error('Error sending admin message:', error);
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Failed to send message' 
            });
        }
    },
    
    async sendMessageToMembers(req: Request, res: Response): Promise<void> {
        try {
            const { messageText, recipientMemberIds } = req.body;
            const senderId = req.user?.id;
            
            if (!senderId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            
            if (!Array.isArray(recipientMemberIds) || recipientMemberIds.length === 0) {
                res.status(400).json({ message: 'No recipients specified' });
                return;
            }

            const senderType = req.user?.role_name === 'member_superuser' ? SenderType.member_superuser : SenderType.member_administrator;
            const message = await messageService.createAdminMessage({
                senderId,
                messageText,
                recipientType: 'group',
                senderType,
                recipientMemberIds
            });
            
            await auditService.logAction(
                'ADMIN_SEND_GROUP_MESSAGE',
                senderId,
                `Admin sent message to ${recipientMemberIds.length} members`,
                req,
                'success',
                undefined,
                req.user?.performer_type
            );

            // Mapiramo poruku za frontend
            const mappedMessage = mapToMemberMessage(message);
            res.status(201).json(mappedMessage); // Vraća se jedna kreirana poruka
        } catch (error) {
            console.error('Error sending group message:', error);
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Failed to send group message' 
            });
        }
    },
    
    async sendMessageToAll(req: Request, res: Response): Promise<void> {
        try {
            const { messageText } = req.body;
            const senderId = req.user?.id;
            
            if (!senderId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const senderType = req.user?.role_name === 'member_superuser' ? SenderType.member_superuser : SenderType.member_administrator;
            const message = await messageService.createAdminMessage({
                senderId,
                messageText,
                recipientType: 'all',
                senderType
            });
            
            await auditService.logAction(
                'ADMIN_SEND_ALL_MESSAGE',
                senderId,
                `Admin sent message to all members`,
                req,
                'success',
                undefined,
                req.user?.performer_type
            );

            // Mapiramo poruku za frontend
            const mappedMessage = mapToMemberMessage(message);
            res.status(201).json(mappedMessage);
        } catch (error) {
            console.error('Error sending message to all members:', error);
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Failed to send message to all members' 
            });
        }
    },
    
    async getMessagesSentByAdmin(req: Request, res: Response): Promise<void> {
        try {
            const adminId = req.user?.id;
            
            if (!adminId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            
            const messages = await messageService.getMessagesSentByAdmin(adminId);
            // Mapiramo poruke za frontend
            const mappedMessages = messages.map(msg => mapToMemberMessage(msg));
            res.status(200).json(mappedMessages);
        } catch (error) {
            console.error('Error fetching admin sent messages:', error);
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Failed to fetch sent messages' 
            });
        }
    },

    async getAdminMessages(req: Request, res: Response): Promise<void> {
        try {
            const currentMemberId = req.user?.id;
            if (!currentMemberId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }
            const messages = await messageService.getAdminMessages(currentMemberId);
            // Mapiramo poruke za frontend
            const mappedMessages = messages.map(msg => mapToMemberMessage(msg));
            res.status(200).json(mappedMessages);
        } catch (error) {
            console.error('Error fetching admin messages:', error);
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Failed to fetch messages' 
            });
        }
    },

    async getMemberMessages(req: Request, res: Response): Promise<void> {
        try {
            const memberId = parseInt(req.params.memberId);

            // Zaštita od neispravnog ID-a
            if (isNaN(memberId)) {
                res.json([]); // Vrati prazan niz ako ID nije broj
                return;
            }


            const messages = await messageService.getMemberMessages(memberId);
            // Mapiramo poruke za frontend
            const mappedMessages = messages.map(msg => mapToMemberMessage(msg));
            res.status(200).json(mappedMessages);
        } catch (error) {
            console.error('Error fetching member messages:', error);
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Failed to fetch messages' 
            });
        }
    },

    async getSentMessages(req: Request, res: Response): Promise<void> {
        try {
            const memberId = req.user?.id;

            if (!memberId) {
                res.status(401).json({ message: 'Niste prijavljeni.' });
                return;
            }

            const messages = await messageService.getSentMessagesByMemberId(memberId);
            const mappedMessages = messages.map(msg => mapToMemberMessage(msg));
            res.json(mappedMessages);
        } catch (error) {
            console.error('Greška pri dohvaćanju poslanih poruka:', error);
            res.status(500).json({ message: 'Greška servera' });
        }
    },

    async markAsRead(req: Request, res: Response): Promise<void> {
        try {
            const messageId = parseInt(req.params.messageId);
            const memberId = req.user?.id; // Preimenovano iz userId

            if (!memberId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            // Opcionalno: provjeriti postoji li poruka prije pokušaja označavanja
            // const message = await messageService.getMessageById(messageId);
            // if (!message) {
            //     res.status(404).json({ message: 'Message not found' });
            //     return;
            // }
            // Gornja provjera se može izostaviti ako smatramo da je dovoljno
            // da repozitorij jednostavno ne napravi ništa ako MessageRecipientStatus ne postoji.

            await messageService.markMessageAsRead(messageId, memberId);
            
            await auditService.logAction(
                'MARK_MESSAGE_AS_READ',
                memberId,
                `Message ${messageId} marked as read by user ${memberId}`,
                req,
                'success',
                memberId,
                req.user?.performer_type
            );

            res.status(200).json({ message: 'Message marked as read' });
        } catch (error) {
            console.error('Error marking message as read:', error);
            const actorIdForAudit = req.user?.id ?? null;
            await auditService.logAction(
                'MARK_MESSAGE_AS_READ_ERROR',
                actorIdForAudit,
                `Error marking message ${req.params.messageId} as read. Error: ${error instanceof Error ? error.message : String(error)}`,
                req,
                'failure',
                undefined,
                req.user?.performer_type
            );
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Failed to mark message as read' 
            });
        }
    },

    async archiveMessage(req: Request, res: Response): Promise<void> {
        try {
            const messageId = parseInt(req.params.messageId);
            const memberId = req.user?.id;

            if (!memberId) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            await messageService.archiveMessage(messageId, memberId);
            
            // Audit log već koristi req.user.id (sada memberId)
            await auditService.logAction(
                'ARCHIVE_MESSAGE',
                memberId,
                `Message ${messageId} archived by user ${memberId}`,
                req,
                'success',
                memberId,
                req.user?.performer_type
            );

            res.json({ message: 'Message archived' });
        } catch (error) {
            console.error('Error archiving message:', error);
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Failed to archive message' 
            });
        }
    },

    async deleteMessage(req: Request, res: Response): Promise<void> {
        try {
            const messageId = parseInt(req.params.messageId);
            const exists = await messageService.messageExists(messageId);
            if (!exists) {
                res.status(404).json({ message: 'Message not found' });
                return;
            }
            await messageService.deleteMessage(messageId);
            
            if (req.user?.id) {
                await auditService.logAction(
                    'DELETE_MESSAGE',
                    req.user.id,
                    `Message ${messageId} deleted`,
                    req,
                    'success',
                    undefined,
                    req.user.performer_type
                );
            }

            res.json({ message: 'Message deleted successfully' });
        } catch (error) {
            console.error('Error deleting message:', error);
            const statusCode = error instanceof Error && error.message === 'Message not found' ? 404 : 500;
            res.status(statusCode).json({ 
                message: error instanceof Error ? error.message : 'Failed to delete message' 
            });
        }
    },

    async deleteAllMessages(req: Request, res: Response): Promise<void> {
        try {
            await messageService.deleteAllMessages();
            
            if (req.user?.id) {
                await auditService.logAction(
                    'DELETE_ALL_MESSAGES',
                    req.user.id,
                    `All messages deleted`,
                    req,
                    'success',
                    undefined,
                    req.user.performer_type
                );
            }

            res.json({ message: 'All messages deleted successfully' });
        } catch (error) {
            console.error('Error deleting all messages:', error);
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Failed to delete all messages' 
            });
        }
    },



async markMemberMessageAsRead(req: Request, res: Response): Promise<void> {
    try {
        const messageId = parseInt(req.params.messageId);
        const memberId = parseInt(req.params.memberId);

        // Provjera postoji li poruka
        const messageExists = await messageService.messageExists(messageId);
        if (!messageExists) {
            res.status(404).json({ message: 'Message not found' });
            return;
        }

        // Provjera je li korisnik autoriziran za ovu akciju
        if (req.user?.id !== memberId && req.user?.role_name !== 'member_administrator' && req.user?.role_name !== 'member_superuser') {
            res.status(403).json({ message: 'Unauthorized to mark this message as read' });
            return;
        }

        await messageService.markMessageAsRead(messageId, memberId);
        
        if (req.user?.id) {
            await auditService.logAction(
                'MARK_MESSAGE_READ',
                req.user.id,
                `Message ${messageId} marked as read for member ${memberId}`,
                req,
                'success',
                memberId,
                req.user.performer_type
            );
        }

        res.status(200).json({ message: 'Message marked as read' });
    } catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({ message: 'Failed to mark message as read' });
    }
},

async getUnreadMessageCount(req: Request, res: Response): Promise<void> {
    try {
        // Dohvati ID člana iz parametra ili iz autentificiranog korisnika
        let memberId: number;
        
        if (req.params.memberId) {
            memberId = parseInt(req.params.memberId);
            
            // Provjera je li korisnik autoriziran za dohvat broja nepročitanih poruka drugog člana
            if (req.user?.id !== memberId && req.user?.role_name !== 'member_administrator' && req.user?.role_name !== 'member_superuser') {
                res.status(403).json({ message: 'Unauthorized to get unread message count for this member' });
                return;
            }
        } else if (req.user?.id) {
            memberId = req.user.id;
        } else {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const count = await messageService.countUnreadMessages(memberId);
        
        res.status(200).json({ count });
    } catch (error) {
        console.error('Error getting unread message count:', error);
        res.status(500).json({ message: 'Failed to get unread message count' });
    }
}
};

export default messageController;