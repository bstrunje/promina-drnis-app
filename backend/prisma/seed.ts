import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// --- 1. SEED SKILLS --- //
export async function seedSkills(tx: Prisma.TransactionClient, organizationId: number = 1) {
  console.log(`🌱 Seeding skills for organization ${organizationId}...`);
  const skillsToSeed = [
    { key: 'basic_mountaineering_school', is_instructor_possible: false },
    { key: 'general_mountaineering_school', is_instructor_possible: false },
    { key: 'advanced_mountaineering_school', is_instructor_possible: false },
    { key: 'trail_marker', is_instructor_possible: true },
    { key: 'mountain_nature_keeper', is_instructor_possible: false },
    { key: 'guide_a_standard', is_instructor_possible: true },
    { key: 'guide_b_standard', is_instructor_possible: true },
    { key: 'guide_c_standard', is_instructor_possible: true },
    { key: 'guide_d_standard', is_instructor_possible: true },
    { key: 'guide_e_standard', is_instructor_possible: true },
    { key: 'guide_f_standard', is_instructor_possible: true },
    { key: 'guide_g_standard', is_instructor_possible: true },
    { key: 'alpinist_apprentice', is_instructor_possible: false },
    { key: 'alpinist', is_instructor_possible: true },
    { key: 'speleologist_apprentice', is_instructor_possible: false },
    { key: 'speleologist', is_instructor_possible: true },
    { key: 'cmrs_member', is_instructor_possible: false },
  ];

  for (const skillData of skillsToSeed) {
    await tx.skill.upsert({
      where: { 
        organization_id_key: {
          organization_id: organizationId,
          key: skillData.key
        }
      },
      update: { name: skillData.key, is_instructor_possible: skillData.is_instructor_possible },
      create: { 
        organization_id: organizationId,
        key: skillData.key, 
        name: skillData.key, 
        is_instructor_possible: skillData.is_instructor_possible 
      },
    });
  }
  console.log('✅ Skills seeded successfully.');
}

// --- 2. SEED ACTIVITY TYPES --- //
export async function seedActivityTypes(tx: Prisma.TransactionClient, organizationId: number = 1) {
  console.log(`🌱 Seeding activity types for organization ${organizationId}...`);
  const activityTypes = [
    { key: 'akcija-drustvo', name: 'AKCIJA DRUŠTVO', description: 'Radne akcije u organizaciji Društva' },
    { key: 'akcija-trail', name: 'AKCIJA TRAIL', description: 'Radne akcije za Trail' },
    { key: 'dezurstva', name: 'DEŽURSTVA', description: 'Dežurstva u domu' },
    { key: 'izleti', name: 'IZLETI', description: 'Organizacija, vođenje i sudjelovanje na izletima' },
    { key: 'razno', name: 'RAZNO', description: 'Ostale razne aktivnosti' },
    { key: 'sastanci', name: 'SASTANCI', description: 'Sastanci članova i upravnog odbora' },
  ];

  for (const type of activityTypes) {
    await tx.activityType.upsert({
      where: { 
        organization_id_key: {
          organization_id: organizationId,
          key: type.key
        }
      },
      update: { name: type.name, description: type.description },
      create: { 
        organization_id: organizationId,
        key: type.key, 
        name: type.name, 
        description: type.description 
      },
    });
  }
  console.log('✅ Activity types seeded successfully.');
}

// --- 3. SEED INITIAL SYSTEM MANAGER --- //
// NAPOMENA: Org-specific System Manager se NE kreira ovdje!
// Kreira se automatski kada Global SM kreira novu organizaciju kroz wizard.
// Ova funkcija je zakomentirana ali ostavljena za referencu.
/*
async function seedInitialSystemManager(tx: Prisma.TransactionClient) {
  console.log('🌱 Seeding initial system manager...');
  const managerExists = await tx.systemManager.count();
  if (managerExists > 0) {
    console.log('Skipping: System Manager already exists.');
    return;
  }

  const username = process.env.INITIAL_SYSTEM_MANAGER_USERNAME || 'systemManager';
  const defaultPassword = process.env.INITIAL_SYSTEM_MANAGER_PASSWORD;
  if (!defaultPassword) {
    console.error('ERROR: Initial system manager password not set in .env. Skipping creation.');
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(defaultPassword, salt);

  await tx.systemManager.create({
    data: {
      id: 0,
      organization_id: 1, // PD Promina - org-specific System Manager
      username,
      display_name: 'System Manager',
      password_hash,
      email: process.env.INITIAL_SYSTEM_MANAGER_EMAIL || 'manager@promina-drnis.hr',
    },
  });
  console.log(`✅ Initial system manager created with username: ${username}`);
  console.warn('IMPORTANT: Please change the default password after first login!');
}
*/

// --- 4. SEED GLOBAL SYSTEM MANAGER --- //
async function seedGlobalSystemManager(tx: Prisma.TransactionClient) {
  console.log('🌱 Seeding global system manager...');
  
  // Provjeri postoji li već globalni SM (organization_id = NULL)
  const globalManagerExists = await tx.systemManager.findFirst({
    where: { organization_id: null }
  });
  
  if (globalManagerExists) {
    console.log('Skipping: Global System Manager already exists.');
    return;
  }

  const username = process.env.GLOBAL_SYSTEM_MANAGER_USERNAME || 'global_manager';
  const password = process.env.GLOBAL_SYSTEM_MANAGER_PASSWORD || 'GlobalManager123';

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(password, salt);

  await tx.systemManager.create({
    data: {
      organization_id: null, // NULL = Global System Manager
      username,
      display_name: 'Global System Manager',
      password_hash,
      email: 'global@system.local', // Dummy email - ne koristi se za login
      password_reset_required: true, // Obavezna promjena lozinke pri prvom logiranju
    },
  });
  
  console.log(`✅ Global system manager created with username: ${username}`);
  console.warn('IMPORTANT: Change the default password after first login!');
}

// --- MAIN SEEDING FUNCTION --- //
async function main() {
  console.log('🚀 Starting database seeding process...');
  console.log(`📊 Database URL: ${process.env.DATABASE_URL?.substring(0, 50)}...`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  await prisma.$transaction(async (tx) => {
    // NAPOMENA: Skills i ActivityTypes se NE seed-aju ovdje!
    // Kreirati će se automatski za svaku novu organizaciju kroz wizard.
    // await seedSkills(tx);
    // await seedActivityTypes(tx);
    
    // Samo Global System Manager se seed-a
    await seedGlobalSystemManager(tx);
  }, {
    timeout: 12000, // 12 sekundi - ispod Prisma Accelerate limita od 15s
  });
  console.log('🎉 Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ An error occurred during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


