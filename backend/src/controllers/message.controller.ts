// src/controllers/message.controller.ts
import { Request, Response } from 'express';

interface Message {
    id: number;
    content: string;
    sender: string;
    timestamp: Date;
}

// In-memory store for messages (replace with database in production)
let messages: Message[] = [];

exports.createMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const message: Message = {
            id: Date.now(),
            content: req.body.content,
            sender: req.body.sender,
            timestamp: new Date()
        };
        
        messages.push(message);

        // Simulate AI response if message is from user
        if (req.body.sender === 'user') {
            setTimeout(() => {
                const aiResponse: Message = {
                    id: Date.now() + 1,
                    content: `AI response to: ${req.body.content}`,
                    sender: 'assistant',
                    timestamp: new Date()
                };
                messages.push(aiResponse);
            }, 1000);
        }

        res.status(201).json({
            success: true,
            data: message
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : 'An unknown error occurred'
        });
    }
};

exports.getMessages = async (req: Request, res: Response): Promise<void> => {
    try {
        res.status(200).json({
            success: true,
            data: messages
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : 'An unknown error occurred'
        });
    }
};

exports.getMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const message = messages.find(m => m.id === parseInt(req.params.id));
        
        if (!message) {
            res.status(404).json({
                success: false,
                message: 'Message not found'
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: message
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : 'An unknown error occurred'
        });
    }
};

exports.deleteMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        const index = messages.findIndex(m => m.id === parseInt(req.params.id));
        
        if (index === -1) {
            res.status(404).json({
                success: false,
                message: 'Message not found'
            });
            return;
        }

        messages.splice(index, 1);

        res.status(200).json({
            success: true,
            message: 'Message deleted successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : 'An unknown error occurred'
        });
    }
};