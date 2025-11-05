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

    // Dohvati samo full_name po tenant-u (organization_id)
    const members = await prisma.member.findMany({
      where: { organization_id },
      select: {
        full_name: true,
      },
      orderBy: [{ full_name: 'asc' }],
    });

    const data = members.map((m) => ({
      full_name: m.full_name ?? '',
    }));

    const outDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const outPath = path.join(outDir, `member-skills-org-${organization_id}.csv`);

    const headers = ['full_name'];
    const escapeCsv = (value: unknown): string => {
      const s = String(value ?? '');
      if (/[",\n\r]/.test(s)) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    const lines = [
      headers.join(','),
      ...data.map((row) => [row.full_name].map(escapeCsv).join(','))
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
