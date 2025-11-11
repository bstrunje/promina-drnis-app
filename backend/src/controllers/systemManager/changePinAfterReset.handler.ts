import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import systemManagerRepository from '../../repositories/systemManager.repository.js';

const JWT_SECRET = process.env.JWT_SECRET!;
const isDev = process.env.NODE_ENV === 'development';

interface ChangePinRequest {
  managerId: number;
  currentPin: string;
  newPin: string;
  tempToken: string;
}

/**
 * Public endpoint za promjenu PIN-a System Manager-a nakon što je admin resetirao PIN
 * Validira temp token i trenutni PIN
 */
export async function changeSystemManagerPinAfterReset(req: Request, res: Response): Promise<void> {
  try {
    const { managerId, currentPin, newPin, tempToken } = req.body as ChangePinRequest;

    if (!managerId || !currentPin || !newPin || !tempToken) {
      res.status(400).json({ message: 'Manager ID, current PIN, new PIN and temp token are required' });
      return;
    }

    // Validacija temp token-a
    try {
      const decoded = jwt.verify(tempToken, JWT_SECRET) as { id: number; scope: string };
      
      if (decoded.id !== managerId || decoded.scope !== 'pin-reset') {
        res.status(401).json({ message: 'Invalid or expired token' });
        return;
      }
    } catch {
      res.status(401).json({ message: 'Invalid or expired token' });
      return;
    }

    // Validacija novog PIN-a
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      res.status(400).json({ message: 'New PIN must be exactly 6 digits' });
      return;
    }

    // Dohvati System Manager-a
    const manager = await systemManagerRepository.findById(managerId);
    if (!manager) {
      res.status(404).json({ message: 'System Manager not found' });
      return;
    }

    // Provjeri je li PIN reset potreban
    if (!manager.pin_reset_required) {
      res.status(400).json({ message: 'PIN reset not required for this manager' });
      return;
    }

    // Validacija trenutnog PIN-a
    if (!manager.pin_hash) {
      res.status(400).json({ message: 'No PIN set for this manager' });
      return;
    }

    const isCurrentPinValid = await bcrypt.compare(currentPin, manager.pin_hash);
    if (!isCurrentPinValid) {
      res.status(401).json({ message: 'Current PIN is incorrect' });
      return;
    }

    // Hash novi PIN
    const salt = await bcrypt.genSalt(10);
    const newPinHash = await bcrypt.hash(newPin, salt);

    // Ažuriraj PIN i resetiraj flag
    await systemManagerRepository.update(managerId, {
      pin_hash: newPinHash,
      pin_set_at: new Date(),
      pin_reset_required: false,
      pin_attempts: 0,
      pin_locked_until: null
    });

    // Provjera da li je update uspio
    await systemManagerRepository.findById(managerId);


    // Generiraj token za automatski login
    const token = jwt.sign(
      { id: manager.id, role: 'SystemManager', type: 'SystemManager', tokenType: 'access' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: manager.id, role: 'SystemManager', type: 'SystemManager', tokenType: 'refresh' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'PIN successfully changed',
      token,
      refreshToken,
      manager: {
        id: manager.id,
        username: manager.username,
        email: manager.email,
        display_name: manager.display_name,
        role: 'SystemManager',
        organization_id: manager.organization_id,
        is_global: manager.organization_id === null
      }
    });
  } catch (error) {
    if (isDev) console.error('Error changing System Manager PIN after reset:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
