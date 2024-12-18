import { Request, Response } from 'express';
import messageService from '../services/message.service.js';
import auditService from '../services/audit.service.js';

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
                    'success'
                );
            }

            res.status(201).json(message);
        } catch (error) {
            console.error('Error creating message:', error);
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Failed to create message' 
            });
        }
    },

    async getAdminMessages(req: Request, res: Response): Promise<void> {
        try {
            const messages = await messageService.getAdminMessages();
            console.log('Fetched admin messages:', messages); // Add logging
            res.status(200).json(messages);
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
            const messages = await messageService.getMemberMessages(memberId);
            res.json(messages);
        } catch (error) {
            console.error('Error fetching member messages:', error);
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Failed to fetch messages' 
            });
        }
    },

    async markAsRead(req: Request, res: Response): Promise<void> {
        try {
            const messageId = parseInt(req.params.messageId);
            await messageService.markMessageAsRead(messageId);
            
            if (req.user?.id) {
                await auditService.logAction(
                    'MARK_MESSAGE_READ',
                    req.user.id,
                    `Message ${messageId} marked as read`,
                    req,
                    'success'
                );
            }

            res.json({ message: 'Message marked as read' });
        } catch (error) {
            console.error('Error marking message as read:', error);
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Failed to mark message as read' 
            });
        }
    },

    async archiveMessage(req: Request, res: Response): Promise<void> {
        try {
            const messageId = parseInt(req.params.messageId);
            await messageService.archiveMessage(messageId);
            
            if (req.user?.id) {
                await auditService.logAction(
                    'ARCHIVE_MESSAGE',
                    req.user.id,
                    `Message ${messageId} archived`,
                    req,
                    'success'
                );
            }

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
                    'success'
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
                    'success'
                );
            }

            res.json({ message: 'All messages deleted successfully' });
        } catch (error) {
            console.error('Error deleting all messages:', error);
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Failed to delete all messages' 
            });
        }
    }
};

export default messageController;