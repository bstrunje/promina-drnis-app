// backend/src/routes/admin.status.ts
import express from 'express';
import { authMiddleware, roles } from '../middleware/authMiddleware.js';
import memberStatusSyncService from '../services/memberStatusSync.service.js';

const router = express.Router();

/**
 * @route POST /api/admin/status/sync-member-statuses
 * @desc Sinkronizira statuse članova na temelju postojanja broja iskaznice
 * @access Private (Admin)
 */
router.post(
  '/sync-member-statuses',
  roles.requireAdmin,
  async (req, res) => {
    try {
      const result = await memberStatusSyncService.runSync(req);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          updatedCount: result.updatedCount
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message,
          updatedCount: result.updatedCount
        });
      }
    } catch (error) {
      console.error('Error syncing member statuses:', error);
      res.status(500).json({
        success: false,
        message: `Greška pri sinkronizaciji statusa članova: ${error instanceof Error ? error.message : 'Nepoznata greška'}`,
        updatedCount: 0
      });
    }
  }
);

export default router;
