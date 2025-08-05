import express, { Request, Response, Router } from 'express';
import fakeTimers from '@sinonjs/fake-timers';

import prisma from '../utils/prisma.js';

const router: Router = express.Router();

// Globalna varijabla za pohranu instance sata
// Ovo je potrebno kako bismo mogli resetirati vrijeme
let clock: fakeTimers.InstalledClock | null = null;

// Middleware za provjeru je li okruženje razvojno
const isDevelopment = (req: Request, res: Response, next: () => void) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ message: 'Ova funkcionalnost je dostupna samo u razvojnom okruženju.' });
  }
  next();
};

// Endpoint za postavljanje lažnog datuma
// POST /api/dev/set-date
router.post('/set-date', isDevelopment, (req: Request, res: Response) => {
  const { date } = req.body;

  if (!date || isNaN(new Date(date).getTime())) {
    return res.status(400).json({ message: 'Potrebno je poslati ispravan datum u ISO formatu.' });
  }

  // Ako već postoji lažni sat, prvo ga resetiramo
  if (clock) {
    clock.uninstall();
  }

  const targetDate = new Date(date);

  // Instaliramo lažni sat koji će presresti sve pozive za dohvaćanje vremena
  clock = fakeTimers.install({ now: targetDate });

  console.log(`🕒 Vrijeme je promijenjeno na: ${targetDate.toLocaleString('hr-HR')}`);
  res.status(200).json({ message: `Vrijeme uspješno postavljeno na ${targetDate.toISOString()}` });
});

// Endpoint za resetiranje vremena na stvarno vrijeme
// POST /api/dev/reset-date
router.post('/reset-date', isDevelopment, (req: Request, res: Response) => {
  if (clock) {
    clock.uninstall();
    clock = null;
    console.log('🕒 Vrijeme je vraćeno na stvarno vrijeme.');
    res.status(200).json({ message: 'Vrijeme uspješno resetirano.' });
  } else {
    res.status(200).json({ message: 'Vrijeme nije bilo promijenjeno.' });
  }
});

// Ruta za resetiranje sekvence za member_id
// Koristi se POST metoda jer operacija mijenja stanje baze podataka
router.post('/reset-member-id-sequence', isDevelopment, async (req, res) => {
  try {
    // Pronađi ime sekvence za tablicu 'members' i stupac 'member_id'
    const sequenceResult = await prisma.$queryRaw<{ sequence_name: string }[]>`
            SELECT pg_get_serial_sequence('members', 'member_id') as sequence_name;
        `;

    if (!sequenceResult.length || !sequenceResult[0].sequence_name) {
      return res.status(404).json({ message: 'Sequence for members.member_id not found.' });
    }

    const sequenceName = sequenceResult[0].sequence_name;

    // Postavi sekvencu na maksimalnu vrijednost member_id
    await prisma.$executeRaw`SELECT setval(${sequenceName}, (SELECT MAX(member_id) FROM members), true);`;

    res.json({ message: `Sequence '${sequenceName}' reset successfully.` });
  } catch (error) {
    console.error('Failed to reset member_id sequence:', error);
    res.status(500).json({ message: 'Failed to reset sequence', error: (error as Error).message });
  }
});

router.get('/test-db', async (req, res) => {
  try {
    const result = await prisma.$queryRaw<{ now: Date }[]>`SELECT NOW() as now`;
    res.json({ message: 'Database connection successful', time: result[0].now });
  } catch (error) {
    console.error('Database connection test failed:', error);
    res.status(500).json({ message: 'Database connection failed', error: (error as Error).message });
  }
});

export default router;
