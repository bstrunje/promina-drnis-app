import express from 'express';
import { authMiddleware as authenticateToken, roles } from '../middleware/authMiddleware.js';
import stampService from '../services/stamp.service.js';

const router = express.Router();

router.get('/inventory', authenticateToken, roles.requireAdmin, async (req, res) => {
    try {
        const inventory = await stampService.getInventoryStatus();
        res.json(inventory);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch inventory' });
    }
});

router.put('/inventory', authenticateToken, roles.requireAdmin, async (req, res) => {
    try {
        const { employed, student, pensioner } = req.body;
        await Promise.all([
            stampService.updateInitialCount('employed', employed),
            stampService.updateInitialCount('student', student),
            stampService.updateInitialCount('pensioner', pensioner)
        ]);
        res.json({ message: 'Inventory updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update inventory' });
    }
});

export default router;