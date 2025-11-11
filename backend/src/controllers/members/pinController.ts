import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../../utils/prisma.js';
import auditService from '../../services/audit.service.js';
import { PerformerType } from '@prisma/client';

const SALT_ROUNDS = 12;
const MAX_PIN_ATTEMPTS = 3;
const LOCKOUT_DURATION_MINUTES = 15;

/**
 * Dohvat PIN statusa za člana
 */
export const getPinStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const memberId = parseInt(req.params.memberId, 10);
    
    if (isNaN(memberId)) {
      res.status(400).json({ message: 'Invalid member ID' });
      return;
    }

    const member = await prisma.member.findUnique({
      where: { member_id: memberId },
      select: {
        pin_hash: true,
        pin_set_at: true,
        pin_attempts: true,
        pin_locked_until: true,
      },
    });

    if (!member) {
      res.status(404).json({ message: 'Member not found' });
      return;
    }

    const now = new Date();
    const isLocked = member.pin_locked_until && member.pin_locked_until > now;

    res.json({
      hasPin: !!member.pin_hash,
      pinSetAt: member.pin_set_at,
      isLocked,
      lockedUntil: member.pin_locked_until,
    });
  } catch (error) {
    console.error('Greška pri dohvaćanju PIN statusa:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Postavljanje ili mijenjanje PIN-a
 */
export const setPin = async (req: Request, res: Response): Promise<void> => {
  try {
    const memberId = parseInt(req.params.memberId, 10);
    const { newPin, currentPin } = req.body;

    if (isNaN(memberId)) {
      res.status(400).json({ message: 'Invalid member ID' });
      return;
    }

    // Validacija PIN-a
    const pinValidation = validatePin(newPin);
    if (pinValidation.error) {
      res.status(400).json({ message: pinValidation.error });
      return;
    }

    const member = await prisma.member.findUnique({
      where: { member_id: memberId },
      select: {
        pin_hash: true,
        pin_attempts: true,
        pin_locked_until: true,
      },
    });

    if (!member) {
      res.status(404).json({ message: 'Member not found' });
      return;
    }

    // Provjeri je li PIN zaključan
    const now = new Date();
    if (member.pin_locked_until && member.pin_locked_until > now) {
      res.status(423).json({ 
        message: `PIN je zaključan do ${member.pin_locked_until.toLocaleString()}` 
      });
      return;
    }

    // Ako član već ima PIN, provjeri trenutni PIN
    if (member.pin_hash) {
      if (!currentPin) {
        res.status(400).json({ message: 'Current PIN is required to change PIN' });
        return;
      }

      const isCurrentPinValid = await bcrypt.compare(currentPin, member.pin_hash);
      if (!isCurrentPinValid) {
        // Povećaj broj pokušaja
        const newAttempts = member.pin_attempts + 1;
        const lockUntil = newAttempts >= MAX_PIN_ATTEMPTS 
          ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
          : null;

        await prisma.member.update({
          where: { member_id: memberId },
          data: {
            pin_attempts: newAttempts,
            pin_locked_until: lockUntil,
          },
        });

        if (lockUntil) {
          res.status(423).json({ 
            message: `Neispravni PIN. Račun je zaključan do ${lockUntil.toLocaleString()}` 
          });
        } else {
          res.status(400).json({ 
            message: `Neispravni trenutni PIN. Preostalo pokušaja: ${MAX_PIN_ATTEMPTS - newAttempts}` 
          });
        }
        return;
      }
    }

    // Hash novi PIN
    const pinHash = await bcrypt.hash(newPin, SALT_ROUNDS);

    // Ažuriraj PIN u bazi
    await prisma.member.update({
      where: { member_id: memberId },
      data: {
        pin_hash: pinHash,
        pin_set_at: new Date(),
        pin_attempts: 0, // Reset pokušaja
        pin_locked_until: null, // Ukloni lockout
        pin_reset_required: false, // Ukloni oznaku prisilne promjene
      },
    });

    res.json({ 
      message: member.pin_hash ? 'PIN successfully changed' : 'PIN successfully set' 
    });
  } catch (error) {
    console.error('Greška pri postavljanju PIN-a:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Uklanjanje PIN-a
 */
export const removePin = async (req: Request, res: Response): Promise<void> => {
  try {
    const memberId = parseInt(req.params.memberId, 10);
    const { currentPin } = req.body;

    if (isNaN(memberId)) {
      res.status(400).json({ message: 'Invalid member ID' });
      return;
    }

    if (!currentPin) {
      res.status(400).json({ message: 'Current PIN is required to remove PIN' });
      return;
    }

    const member = await prisma.member.findUnique({
      where: { member_id: memberId },
      select: {
        pin_hash: true,
        pin_attempts: true,
        pin_locked_until: true,
      },
    });

    if (!member) {
      res.status(404).json({ message: 'Member not found' });
      return;
    }

    if (!member.pin_hash) {
      res.status(400).json({ message: 'No PIN set for this member' });
      return;
    }

    // Provjeri je li PIN zaključan
    const now = new Date();
    if (member.pin_locked_until && member.pin_locked_until > now) {
      res.status(423).json({ 
        message: `PIN je zaključan do ${member.pin_locked_until.toLocaleString()}` 
      });
      return;
    }

    // Provjeri trenutni PIN
    const isCurrentPinValid = await bcrypt.compare(currentPin, member.pin_hash);
    if (!isCurrentPinValid) {
      // Povećaj broj pokušaja
      const newAttempts = member.pin_attempts + 1;
      const lockUntil = newAttempts >= MAX_PIN_ATTEMPTS 
        ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
        : null;

      await prisma.member.update({
        where: { member_id: memberId },
        data: {
          pin_attempts: newAttempts,
          pin_locked_until: lockUntil,
        },
      });

      if (lockUntil) {
        res.status(423).json({ 
          message: `Neispravni PIN. Račun je zaključan do ${lockUntil.toLocaleString()}` 
        });
      } else {
        res.status(400).json({ 
          message: `Neispravni trenutni PIN. Preostalo pokušaja: ${MAX_PIN_ATTEMPTS - newAttempts}` 
        });
      }
      return;
    }

    // Ukloni PIN
    await prisma.member.update({
      where: { member_id: memberId },
      data: {
        pin_hash: null,
        pin_set_at: null,
        pin_attempts: 0,
        pin_locked_until: null,
      },
    });

    res.json({ message: 'PIN successfully removed' });
  } catch (error) {
    console.error('Greška pri uklanjanju PIN-a:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Provjera PIN-a (za login proces)
 */
export const verifyPin = async (memberId: number, pin: string): Promise<boolean> => {
  try {
    const member = await prisma.member.findUnique({
      where: { member_id: memberId },
      select: {
        pin_hash: true,
        pin_attempts: true,
        pin_locked_until: true,
      },
    });

    if (!member || !member.pin_hash) {
      return false;
    }

    // Provjeri je li PIN zaključan
    const now = new Date();
    if (member.pin_locked_until && member.pin_locked_until > now) {
      throw new Error(`PIN je zaključan do ${member.pin_locked_until.toLocaleString()}`);
    }

    const isValid = await bcrypt.compare(pin, member.pin_hash);
    
    if (isValid) {
      // Reset pokušaja pri uspješnoj provjeri
      await prisma.member.update({
        where: { member_id: memberId },
        data: {
          pin_attempts: 0,
          pin_locked_until: null,
        },
      });
    } else {
      // Povećaj broj pokušaja
      const newAttempts = member.pin_attempts + 1;
      const lockUntil = newAttempts >= MAX_PIN_ATTEMPTS 
        ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
        : null;

      await prisma.member.update({
        where: { member_id: memberId },
        data: {
          pin_attempts: newAttempts,
          pin_locked_until: lockUntil,
        },
      });

      if (lockUntil) {
        throw new Error(`Neispravni PIN. Račun je zaključan do ${lockUntil.toLocaleString()}`);
      }
    }

    return isValid;
  } catch (error) {
    console.error('Greška pri provjeri PIN-a:', error);
    throw error;
  }
};

/**
 * Validacija PIN-a
 */
function validatePin(pin: string): { error?: string } {
  if (!pin) return { error: 'PIN je obavezan' };
  if (typeof pin !== 'string') return { error: 'PIN mora biti string' };
  if (pin.length < 4) return { error: 'PIN mora imati najmanje 4 znamenke' };
  if (pin.length > 6) return { error: 'PIN može imati najviše 6 znamenki' };
  if (!/^\d+$/.test(pin)) return { error: 'PIN može sadržavati samo brojeve' };
  
  // Provjeri ponavljajuće brojeve
  if (/^(\d)\1+$/.test(pin)) {
    return { error: 'PIN ne može biti isti broj (npr. 1111)' };
  }
  
  // Provjeri jednostavne sekvence
  const sequences = ['0123', '1234', '2345', '3456', '4567', '5678', '6789'];
  const reverseSequences = sequences.map(seq => seq.split('').reverse().join(''));
  
  if (sequences.includes(pin) || reverseSequences.includes(pin)) {
    return { error: 'PIN ne može biti jednostavna sekvenca (npr. 1234)' };
  }
  
  return {};
}

/**
 * Generiranje random 6-znamenkastog PIN-a koji zadovoljava validacijska pravila
 */
function generateRandomPin(): string {
  let pin: string;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    // Generiraj 6 random znamenki
    pin = Math.floor(100000 + Math.random() * 900000).toString();
    attempts++;
    
    if (attempts >= maxAttempts) {
      // Fallback na siguran PIN
      pin = '123890'; // Ne sekvenca, ne ponavljanje
      break;
    }
  } while (validatePin(pin).error);

  return pin;
}

/**
 * Reset PIN-a za člana (samo OSM, GSM ili Superuser)
 * Ova funkcija postavlja novi PIN i oznaka da korisnik mora promijeniti PIN pri sljedećoj prijavi
 */
export const resetMemberPin = async (req: Request, res: Response): Promise<void> => {
  try {
    const memberId = parseInt(req.params.memberId, 10);
    const { newPin, _notifyMember } = req.body;

    if (isNaN(memberId)) {
      res.status(400).json({ message: 'Invalid member ID' });
      return;
    }

    // Provjeri autorizaciju - samo OSM, GSM ili Superuser
    const user = (req as { user?: { role?: string; type?: string; user_type?: string; id?: number } }).user;
    
    console.log('[PIN-RESET] User object:', {
      id: user?.id,
      role: user?.role,
      type: user?.type,
      user_type: user?.user_type
    });
    
    const isSystemManager = user?.type === 'SystemManager' || user?.user_type === 'SystemManager';
    const isSuperuser = user?.role === 'member_superuser';

    if (!isSystemManager && !isSuperuser) {
      console.log('[PIN-RESET] Authorization FAILED - not SM or Superuser');
      res.status(403).json({ message: 'Only System Managers and Superusers can reset member PINs' });
      return;
    }
    
    console.log('[PIN-RESET] Authorization OK:', { isSystemManager, isSuperuser });

    const member = await prisma.member.findUnique({
      where: { member_id: memberId },
      select: {
        member_id: true,
        first_name: true,
        last_name: true,
        email: true,
        pin_hash: true,
        organization_id: true, // Potrebno za multi-tenancy check
      },
    });

    if (!member) {
      res.status(404).json({ message: 'Member not found' });
      return;
    }

    // Multi-tenancy check: OSM može resetirati PIN samo članovima iz svoje organizacije
    if (isSystemManager) {
      const systemManager = await prisma.systemManager.findUnique({
        where: { id: user?.id },
        select: { organization_id: true }
      });

      console.log('[PIN-RESET] Multi-tenancy check:', {
        systemManagerId: user?.id,
        systemManagerOrgId: systemManager?.organization_id,
        memberOrgId: member.organization_id,
        isGSM: systemManager?.organization_id === null
      });

      // Ako je OSM (organization_id !== null), može samo članove iz svoje organizacije
      if (systemManager?.organization_id !== null && systemManager?.organization_id !== member.organization_id) {
        console.log('[PIN-RESET] BLOCKED: OSM cannot reset PIN for members outside their organization');
        res.status(403).json({ message: 'You can only reset PINs for members in your organization' });
        return;
      }
    }

    // Generiraj ili koristi zadani PIN
    const pinToSet = newPin || generateRandomPin();

    // Validacija PIN-a
    const pinValidation = validatePin(pinToSet);
    if (pinValidation.error) {
      res.status(400).json({ message: pinValidation.error });
      return;
    }

    // Hash novi PIN
    const pinHash = await bcrypt.hash(pinToSet, SALT_ROUNDS);

    // Postavi PIN s oznakom da treba promijeniti
    await prisma.member.update({
      where: { member_id: memberId },
      data: {
        pin_hash: pinHash,
        pin_set_at: new Date(),
        pin_attempts: 0,
        pin_locked_until: null,
        pin_reset_required: true, // Prisilna promjena pri sljedećoj prijavi
      },
    });

    // Audit logging
    const performerType = isSystemManager ? PerformerType.SYSTEM_MANAGER : PerformerType.MEMBER;
    const performerId = user?.id || 0;
    
    await auditService.logAction(
      'RESET_MEMBER_PIN',
      performerId,
      JSON.stringify({
        memberName: `${member.first_name} ${member.last_name}`,
        resetBy: isSystemManager ? 'System Manager' : 'Superuser',
        mustChangePin: true
      }),
      req,
      'success',
      memberId,
      performerType
    );

    // TODO: Ako je notifyMember true, pošalji email članu s novim PIN-om
    // Ovo će biti implementirano kasnije kada bude email sustav

    res.json({
      message: 'PIN successfully reset',
      memberName: `${member.first_name} ${member.last_name}`,
      newPin: newPin ? undefined : pinToSet, // Vrati PIN samo ako je generiran
      mustChangePin: true,
    });
  } catch (error) {
    console.error('Error resetting member PIN:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
