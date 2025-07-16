import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const skillsToSeed = [
  { name: 'Mala planinarska škola', is_instructor_possible: false },
  { name: 'Opća planinarska škola', is_instructor_possible: false },
  { name: 'Viša planinarska škola', is_instructor_possible: false },
  { name: 'Markacist', is_instructor_possible: true },
  { name: 'Čuvar planinske prirode', is_instructor_possible: false },
  { name: 'Vodič A standarda', is_instructor_possible: true },
  { name: 'Vodič B standarda', is_instructor_possible: true },
  { name: 'Vodič C standarda', is_instructor_possible: true },
  { name: 'Vodič D standarda', is_instructor_possible: true },
  { name: 'Vodič E standarda', is_instructor_possible: true },
  { name: 'Vodič F standarda', is_instructor_possible: true },
  { name: 'Vodič G standarda', is_instructor_possible: true },
  { name: 'Alpinist pripravnik', is_instructor_possible: false },
  { name: 'Alpinist', is_instructor_possible: true },
  { name: 'Speleološki pripravnik', is_instructor_possible: false },
  { name: 'Speleolog', is_instructor_possible: true },
  { name: 'Pripadnik HGSS-a', is_instructor_possible: false },
];

async function main() {
  console.log('Start seeding skills...');
  for (const skillData of skillsToSeed) {
    const skill = await prisma.skill.upsert({
      where: { name: skillData.name },
      update: {},
      create: skillData,
    });
    console.log(`Created or found skill: ${skill.name}`);
  }
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
