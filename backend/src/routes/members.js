import express from 'express';
import memberController from '../controllers/memberController.js';

const router = express.Router();

router.get('/', memberController.getAllMembers);
router.post('/', memberController.createMember);
router.get('/:id', memberController.getMemberById);
router.put('/:id', memberController.updateMember);
router.delete('/:id', memberController.deleteMember);
router.get('/:id/stats', memberController.getMemberStats);

export default router;