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

router.put('/inventory', 
    authenticateToken, 
    roles.requireAdmin, 
    async (req, res) => {
        try {
            const { employed, student, pensioner } = req.body;
            await Promise.all([
                stampService.updateInitialCount('employed', employed),
                stampService.updateInitialCount('student', student),
                stampService.updateInitialCount('pensioner', pensioner)
            ]);
            res.json({ message: 'Inventory updated successfully' });
        } catch (error) {
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Failed to update inventory' 
            });
        }
    }
);

// Nova ruta za dohvaćanje povijesti markica
router.get('/history', 
    authenticateToken, 
    roles.requireAdmin, 
    async (req, res) => {
        try {
            const history = await stampService.getStampHistory();
            res.json(history);
        } catch (error) {
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Failed to fetch stamp history' 
            });
        }
    }
);

// Nova ruta za dohvaćanje povijesti markica za određenu godinu
router.get('/history/:year', 
    authenticateToken, 
    roles.requireAdmin, 
    async (req, res) => {
        try {
            const year = parseInt(req.params.year);
            if (isNaN(year)) {
                return res.status(400).json({ message: 'Invalid year parameter' });
            }
            
            const history = await stampService.getStampHistoryByYear(year);
            res.json(history);
        } catch (error) {
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Failed to fetch stamp history' 
            });
        }
    }
);

// Nova ruta za arhiviranje trenutnog stanja i resetiranje za novu godinu
router.post('/reset-year', 
    authenticateToken, 
    roles.requireSuperUser, // Samo superuser može resetirati inventar
    async (req, res) => {
        try {
            const { year, notes } = req.body;
            
            if (!year || isNaN(parseInt(year))) {
                return res.status(400).json({ message: 'Valid year parameter is required' });
            }
            
            // Dohvati ID člana iz tokena
            const memberId = req.user!.id;
            
            const result = await stampService.archiveAndResetInventory(
                parseInt(year), 
                memberId, 
                notes || ''
            );
            
            res.json(result);
        } catch (error) {
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Failed to reset inventory' 
            });
        }
    }
);

export default router;