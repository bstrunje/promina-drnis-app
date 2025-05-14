import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Lozinke za testne korisnike
  const adminPassword = await bcrypt.hash('admin123', 10);
  const superuserPassword = await bcrypt.hash('superuser123', 10);

  // Kreiraj system admina
  const systemAdmin = await prisma.system_admin.upsert({
    where: { username: 'systemadmin' },
    update: {},
    create: {
      username: 'systemadmin',
      email: 'systemadmin@example.com',
      password_hash: adminPassword,
      display_name: 'System Admin'
    }
  });

  // Kreiraj superusera kao člana
  // OIB i ostala polja su obavezna prema shemi
  const superuserOib = '12345678901';
  const superuser = await prisma.member.upsert({
    where: { oib: superuserOib },
    update: {},
    create: {
      oib: superuserOib,
      first_name: 'Super',
      last_name: 'User',
      full_name: 'Super User',
      email: 'superuser@example.com',
      status: 'active',
      password_hash: superuserPassword,
      role: 'superuser',
      cell_phone: '0912345678',
      city: 'TestGrad',
      street_address: 'Test Ulica 1'
    }
  });

  // Dodaj admin_permissions za superusera
  // Koristi samo postojeća polja iz modela
  await prisma.adminPermissions.upsert({
    where: { member_id: superuser.member_id },
    update: { can_manage_end_reasons: true },
    create: {
      member_id: superuser.member_id,
      can_manage_end_reasons: true,
      granted_by: systemAdmin.id,
      granted_at: new Date()
    }
  });

  console.log('Seed podaci su uspješno dodani!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
