import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// --- 1. SEED SKILLS --- //
async function seedSkills(tx: Prisma.TransactionClient) {
  console.log('🌱 Seeding skills...');
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
      where: { key: skillData.key },
      update: { name: skillData.key, is_instructor_possible: skillData.is_instructor_possible },
      create: { key: skillData.key, name: skillData.key, is_instructor_possible: skillData.is_instructor_possible },
    });
  }
  console.log('✅ Skills seeded successfully.');
}

// --- 2. SEED ACTIVITY TYPES --- //
async function seedActivityTypes(tx: Prisma.TransactionClient) {
  console.log('🌱 Seeding activity types...');
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
      where: { key: type.key },
      update: { name: type.name, description: type.description },
      create: { key: type.key, name: type.name, description: type.description },
    });
  }
  console.log('✅ Activity types seeded successfully.');
}

// --- 3. SEED INITIAL SYSTEM MANAGER --- //
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
      username,
      display_name: 'System Manager',
      password_hash,
      email: process.env.INITIAL_SYSTEM_MANAGER_EMAIL || 'manager@promina-drnis.hr',
    },
  });
  console.log(`✅ Initial system manager created with username: ${username}`);
  console.warn('IMPORTANT: Please change the default password after first login!');
}

// --- MAIN SEEDING FUNCTION --- //
async function main() {
  console.log('🚀 Starting database seeding process...');
  await prisma.$transaction(async (tx) => {
    await seedSkills(tx);
    await seedActivityTypes(tx);
    await seedInitialSystemManager(tx);
  }, {
    timeout: 30000, // 30 sekundi timeout za Vercel serverless okruženje
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


