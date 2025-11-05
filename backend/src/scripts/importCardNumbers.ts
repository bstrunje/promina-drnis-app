import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import prisma from '../utils/prisma.js';

async function main() {
  try {
    const orgIdRaw = process.env.ORG_ID ?? process.argv[2];
    const inputArg = process.env.INPUT_FILE ?? process.argv[3];

    if (!orgIdRaw) {
      console.error('Usage: set ORG_ID and optionally INPUT_FILE, then run the script. Example: ORG_ID=1 INPUT_FILE=./scripts/card_numbers.txt');
      console.error('PowerShell: $env:ORG_ID=1; $env:INPUT_FILE=".\\scripts\\card_numbers.txt"; npm run build; node dist/src/scripts/importCardNumbers.js');
      process.exit(1);
    }
    const organization_id = Number(orgIdRaw);
    if (!Number.isFinite(organization_id)) {
      console.error('ORG_ID mora biti broj');
      process.exit(1);
    }

    const defaultFile = path.join(process.cwd(), 'scripts', 'card_numbers.txt');
    const inputFile = inputArg ? path.resolve(process.cwd(), inputArg) : defaultFile;

    if (!fs.existsSync(inputFile)) {
      console.error(`Datoteka s brojevima ne postoji: ${inputFile}`);
      process.exit(1);
    }

    const raw = fs.readFileSync(inputFile, { encoding: 'utf8' });
    const lines = raw.split(/\r?\n/).map((s) => s.trim());
    const filtered = lines.filter((s) => s.length > 0);

    const unique = Array.from(new Set(filtered));

    const invalidTooLong = unique.filter((s) => s.length > 20);
    if (invalidTooLong.length > 0) {
      console.error(`Pronađeni brojevi dulji od 20 znakova (schema ogranicenje): ${invalidTooLong.slice(0, 5).join(', ')} ...`);
      process.exit(1);
    }

    const notLengthSix = unique.filter((s) => s.length !== 6);
    if (notLengthSix.length > 0) {
      console.warn(`Upozorenje: ${notLengthSix.length} brojeva nema duljinu 6. Nastavljam s importom svejedno (schema dopušta do 20).`);
    }

    const data = unique.map((card_number) => ({
      organization_id,
      card_number,
      status: 'available' as const,
    }));

    if (data.length === 0) {
      console.log('Nema podataka za unos.');
      return;
    }

    const result = await prisma.cardNumber.createMany({ data, skipDuplicates: true });

    console.log(`Ulaznih brojeva: ${unique.length}`);
    console.log(`Dodano novih: ${result.count}`);
    console.log(`Preskočeno (duplikati): ${unique.length - result.count}`);
  } catch (err) {
    console.error('Greška pri importu:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
