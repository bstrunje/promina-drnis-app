import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import prisma from '../utils/prisma.js';

async function main() {
  try {
    // ORG_ID iz env varijable ili iz CLI argumenta (drugi argument)
    const orgIdRaw = process.env.ORG_ID ?? process.argv[2];
    if (!orgIdRaw) {
      console.error('Usage: set ORG_ID and run the script. Example: ORG_ID=1');
      console.error('PowerShell primjer: $env:ORG_ID=1; npm run build; node dist/src/scripts/exportMemberSkills.js');
      process.exit(1);
    }
    const organization_id = Number(orgIdRaw);
    if (!Number.isFinite(organization_id)) {
      console.error('ORG_ID mora biti broj');
      process.exit(1);
    }

    // Dohvati članove po tenant-u (organization_id)
    const members = await prisma.member.findMany({
      where: { organization_id },
      select: {
        member_id: true,
        first_name: true,
        last_name: true,
        // Ako postoji full_name polje u bazi, moglo bi se dodati ovdje.
        other_skills: true,
      },
      orderBy: [{ last_name: 'asc' }, { first_name: 'asc' }],
    });

    const data = members.map((m) => ({
      member_id: m.member_id,
      full_name: `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim(),
      other_skills: m.other_skills ?? ''
    }));

    const outDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const outPath = path.join(outDir, `member-skills-org-${organization_id}.csv`);

    const headers = ['member_id', 'full_name', 'other_skills'];
    const escapeCsv = (value: unknown): string => {
      const s = String(value ?? '');
      if (/[",\n\r]/.test(s)) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    const lines = [
      headers.join(','),
      ...data.map((row) => [row.member_id, row.full_name, row.other_skills].map(escapeCsv).join(','))
    ];
    fs.writeFileSync(outPath, lines.join('\n') + '\n', { encoding: 'utf8' });

    console.log(`Exportirano (CSV): ${outPath}`);
  } catch (err) {
    console.error('Greška pri exportu:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
