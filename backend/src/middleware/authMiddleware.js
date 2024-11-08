// backend/src/controllers/auth.controller.js
import authService from '../services/auth.service.js';

const authController = {
    async register(req, res) {
        try {
            const { username, email, password, firstName, lastName, role } = req.body;
            
            const result = await authService.register({
                username,
                email,
                password,
                firstName,
                lastName,
                role
            });

            res.status(201).json(result);
        } catch (error) {
            console.error('Registration error:', error);
            if (error.message.includes('already exists')) {
                res.status(400).json({ message: error.message });
            } else if (error.message.includes('Invalid role')) {
                res.status(400).json({ message: error.message });
            } else {
                res.status(500).json({ message: 'Error registering user' });
            }
        }
    },

    async login(req, res) {
        try {
            const { username, password } = req.body;
            const result = await authService.login({ username, password });
            res.json(result);
        } catch (error) {
            console.error('Login error:', error);
            if (error.message.includes('Invalid credentials')) {
                res.status(401).json({ message: error.message });
            } else {
                res.status(500).json({ message: 'Error logging in' });
            }
        }
    }
};

export default authController;