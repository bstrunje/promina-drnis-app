#!/bin/sh
# entrypoint.sh

# Izlazimo odmah ako neka naredba ne uspije
set -e

echo "Database is healthy, entrypoint script continues..."

# Pokrećemo migracije baze podataka
echo "Running database migrations..."
npx prisma migrate deploy

# Pokrećemo seedanje baze
echo "Seeding database..."
npm run prisma:seed

# Pokrećemo setup skriptu (kreiranje System Managera)
echo "Running database setup..."
node dist/run-setup.js

# Zatim pokrećemo glavni proces kontejnera (ono što je definirano kao CMD u Dockerfile-u)
echo "Starting the application..."
exec "$@"
