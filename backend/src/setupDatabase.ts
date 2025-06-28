import prisma from './utils/prisma.js';
import bcrypt from 'bcrypt';

/**
 * Kreira početnog system managera ako ne postoji u bazi
 * Ova funkcija se poziva nakon inicijalizacije baze i automatski kreira
 * system manager račun ako ne postoji ni jedan u bazi
 */
export async function createInitialSystemManagerIfNeeded(): Promise<void> {
  try {
    // Provjeri postoji li već system manager u bazi
    const managerExists = (await prisma.systemManager.count()) > 0;

    if (managerExists) {
      console.log('✅ System Manager already exists, skipping creation');
      return;
    }

    // Ako ne postoji, kreiraj ga
    const username =
      process.env.INITIAL_SYSTEM_MANAGER_USERNAME || 'systemManager';
    const email = process.env.INITIAL_SYSTEM_MANAGER_EMAIL || 'manager@example.com';
    const defaultPassword = process.env.INITIAL_SYSTEM_MANAGER_PASSWORD || 'password123';
    const display_name = 'System Manager';

    if (!defaultPassword) {
        console.error('❌ Initial system manager password is not set in .env file. Skipping creation.');
        return;
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(defaultPassword, salt);

    await prisma.systemManager.create({
      data: {
        username,
        email,
        display_name,
        password_hash,
      },
    });

    console.log(`✅ Initial system manager created with username: ${username}`);
    console.log(
      `⚠️  IMPORTANT: Please change the default password after first login!`
    );
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${defaultPassword}`);
    console.log(`   (Ovi podaci se nalaze u .env datoteci)`);
  } catch (error) {
    console.error('❌ Error creating initial system manager:', error);
    // Ne bacamo iznimku kako ne bismo srušili aplikaciju ako se ovo ne uspije izvršiti
  }
}

/**
 * Postavlja osnovne vrste aktivnosti ako ne postoje u bazi.
 */
export async function setupActivityTypes(): Promise<void> {
  try {
    console.log('Inicijalizacija vrsta aktivnosti...');

    const activityTypes = [
      {
        name: 'AKCIJA DRUŠTVO',
        description: 'Radne akcije u organizaciji Društva',
      },
      {
        name: 'AKCIJA TRAIL',
        description: 'Radne akcije za Trail',
      },
      {
        name: 'DEŽURSTVA',
        description: 'Dežurstva u domu',
      },
      {
        name: 'IZLETI',
        description: 'Sudjelovanje na izletima',
      },
      {
        name: 'ORGANIZACIJA i VOĐENJE IZLETA',
        description: 'Organizacija i vođenje izleta',
      },
      {
        name: 'RAZNO',
        description: 'Ostale razne aktivnosti',
      },
      {
        name: 'SASTANCI',
        description: 'Sastanci članova i upravnog odbora',
      },
    ];

    for (const type of activityTypes) {
      await prisma.activityType.upsert({
        where: { name: type.name },
        update: { description: type.description },
        create: {
          name: type.name,
          description: type.description,
        },
      });
    }

    console.log('✅ Vrste aktivnosti uspješno postavljene.');
  } catch (error) {
    console.error('❌ Greška prilikom postavljanja vrsta aktivnosti:', error);
  }
}
