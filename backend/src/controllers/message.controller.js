// src/controllers/messageController.js
// In-memory store for messages (replace with database in production)
let messages = [];

exports.createMessage = async (req, res) => {
    try {
        const message = {
            id: Date.now(),
            content: req.body.content,
            sender: req.body.sender,
            timestamp: new Date()
        };
        
        messages.push(message);

        // Simulate AI response if message is from user
        if (req.body.sender === 'user') {
            setTimeout(() => {
                const aiResponse = {
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
            message: error.message
        });
    }
};

exports.getMessages = async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            data: messages
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

exports.getMessage = async (req, res) => {
    try {
        const message = messages.find(m => m.id === parseInt(req.params.id));
        
        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        res.status(200).json({
            success: true,
            data: message
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

exports.deleteMessage = async (req, res) => {
    try {
        const index = messages.findIndex(m => m.id === parseInt(req.params.id));
        
        if (index === -1) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        messages.splice(index, 1);

        res.status(200).json({
            success: true,
            message: 'Message deleted successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};