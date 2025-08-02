#!/bin/sh
# entrypoint.sh

# Izlazimo odmah ako neka naredba ne uspije
set -e

echo "Database is healthy, entrypoint script continues..."

# Pokrećemo migracije baze podataka
echo "Running database migrations..."
npx prisma migrate deploy

# Pokrećemo jedinstvenu seed skriptu (vještine, tipovi aktivnosti, system manager)
echo "Seeding database..."
npm run seed

echo "Handing over to CMD..."
exec "$@"
