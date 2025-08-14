import express, { Request, Response } from 'express';
import { authMiddleware as authenticateToken, roles } from '../middleware/authMiddleware.js';
import stampService from '../services/stamp.service.js';

const router = express.Router();

router.get('/inventory', authenticateToken, roles.requireAdmin, async (req, res) => {
    try {
        const inventory = await stampService.getInventoryStatus();
        res.json(inventory);
    } catch (_error) {
        res.status(500).json({ message: 'Failed to fetch inventory' });
    }
});

// Dohvat inventara za konkretnu godinu
router.get('/inventory/:year', authenticateToken, roles.requireAdmin, async (req, res) => {
    try {
        const year = parseInt(req.params.year);
        if (isNaN(year)) {
            return res.status(400).json({ message: 'Invalid year parameter' });
        }
        
        const inventory = await stampService.getInventoryStatusByYear(year);
        res.json(inventory);
    } catch (_error) {
        res.status(500).json({ 
            message: _error instanceof Error ? _error.message : 'Failed to fetch inventory for year' 
        });
    }
});

router.put('/inventory', 
    authenticateToken, 
    roles.requireAdmin, 
    async (req, res) => {
        try {
            const { employed, student, pensioner, year } = req.body;
            
            // Validacija da imamo godinu
            if (!year || isNaN(parseInt(year))) {
                return res.status(400).json({ message: 'Valid year parameter is required' });
            }
            
            const yearValue = parseInt(year);
            
            // Dodana provjera je li podatak broj
            if (isNaN(employed) || isNaN(student) || isNaN(pensioner)) {
                return res.status(400).json({ message: 'All inventory values must be numbers' });
            }
            
            const employedValue = parseInt(employed) || 0;
            const studentValue = parseInt(student) || 0;
            const pensionerValue = parseInt(pensioner) || 0;
            
            // Dodatna sigurnosna provjera protiv negativnih vrijednosti
            if (employedValue < 0 || studentValue < 0 || pensionerValue < 0) {
                return res.status(400).json({ message: 'Inventory values cannot be negative' });
            }
            
            console.log(`Updating inventory for year ${yearValue}:`, {
                employed: employedValue,
                student: studentValue,
                pensioner: pensionerValue
            });
            
            await Promise.all([
                stampService.updateInitialCount('employed', employedValue, yearValue),
                stampService.updateInitialCount('student', studentValue, yearValue),
                stampService.updateInitialCount('pensioner', pensionerValue, yearValue)
            ]);
            
            // Vraćamo ažurirani inventar za tu godinu
            const updatedInventory = await stampService.getInventoryStatusByYear(yearValue);
            
            res.json({ 
                message: `Inventory for year ${yearValue} updated successfully`,
                inventory: updatedInventory
            });
        } catch (_error) {
            console.error('Error updating inventory:', _error);
            res.status(500).json({ 
                message: _error instanceof Error ? _error.message : 'Failed to update inventory' 
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
        } catch (_error) {
            res.status(500).json({ 
                message: _error instanceof Error ? _error.message : 'Failed to fetch stamp history' 
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
        } catch (_error) {
            res.status(500).json({ 
                message: _error instanceof Error ? _error.message : 'Failed to fetch stamp history' 
            });
        }
    }
);

// Nova ruta za arhiviranje stanja inventara markica za određenu godinu (bez resetiranja)
router.post('/archive-year', 
    authenticateToken, 
    roles.requireSuperUser, // Samo superuser može arhivirati inventar
    async (req, res) => {
        try {
            const { year, notes, force = false } = req.body;
            
            if (!year || isNaN(parseInt(year))) {
                return res.status(400).json({ message: 'Valid year parameter is required' });
            }
            
            // Dohvati ID člana iz tokena
            const memberId = req.user!.id;
            
            const result = await stampService.archiveStampInventory(
                parseInt(year), 
                memberId, 
                notes || '',
                force // Dodajemo force parametar
            );
            
            res.json(result);
        } catch (_error) {
            res.status(500).json({ 
                message: _error instanceof Error ? _error.message : 'Failed to archive inventory' 
            });
        }
    }
);

// Stara ruta za arhiviranje trenutnog stanja i resetiranje za novu godinu 
// Ostavljena za kompatibilnost, ali preporučuje se koristiti /archive-year umjesto ove
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
            
            // Koristimo novu funkciju za arhiviranje bez resetiranja
            const result = await stampService.archiveStampInventory(
                parseInt(year), 
                memberId, 
                notes || ''
            );
            
            res.json({
                ...result,
                message: 'Inventory successfully archived. Reset functionality is deprecated, please use /archive-year endpoint instead.'
            });
        } catch (_error) {
            res.status(500).json({ 
                message: _error instanceof Error ? _error.message : 'Failed to archive inventory' 
            });
        }
    }
);

// GET /api/stamps/members/:stampType/:year - Dohvati članove s određenim tipom markice za godinu
router.get('/members/:stampType/:year', 
    authenticateToken,
    roles.requireAdmin,
    async (req: Request, res: Response) => {
        try {
            const { stampType, year } = req.params;
            const yearNumber = parseInt(year);
            
            if (isNaN(yearNumber)) {
                return res.status(400).json({ message: 'Invalid year parameter' });
            }

            const members = await stampService.getMembersWithStamp(stampType, yearNumber);
            res.json(members);
        } catch (error) {
            console.error('Error fetching members with stamps:', error);
            res.status(500).json({ 
                message: error instanceof Error ? error.message : 'Failed to fetch members with stamps' 
            });
        }
    }
);

export default router;