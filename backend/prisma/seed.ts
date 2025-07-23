import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
  { key: 'cmrs_member', is_instructor_possible: false }, // Croatian Mountain Rescue Service
];

const skillKeyToNameHr: Record<string, string> = {
  basic_mountaineering_school: 'Mala planinarska škola',
  general_mountaineering_school: 'Opća planinarska škola',
  advanced_mountaineering_school: 'Viša planinarska škola',
  trail_marker: 'Markacist',
  mountain_nature_keeper: 'Čuvar planinske prirode',
  guide_a_standard: 'Vodič A standarda',
  guide_b_standard: 'Vodič B standarda',
  guide_c_standard: 'Vodič C standarda',
  guide_d_standard: 'Vodič D standarda',
  guide_e_standard: 'Vodič E standarda',
  guide_f_standard: 'Vodič F standarda',
  guide_g_standard: 'Vodič G standarda',
  alpinist_apprentice: 'Alpinist pripravnik',
  alpinist: 'Alpinist',
  speleologist_apprentice: 'Speleološki pripravnik',
  speleologist: 'Speleolog',
  cmrs_member: 'Pripadnik HGSS-a',
};

async function main() {
  console.log('Start seeding skills...');
  for (const skillData of skillsToSeed) {
    const name = skillKeyToNameHr[skillData.key];
    const skill = await prisma.skill.upsert({
      where: { key: skillData.key },
      update: {},
      create: {
        key: skillData.key,
        name,
        is_instructor_possible: skillData.is_instructor_possible,
      },
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
