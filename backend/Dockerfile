# Faza 1: Builder - Ovdje gradimo aplikaciju
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Kopiramo package.json i package-lock.json
COPY package*.json ./

# Kopiramo Prisma shemu PRIJE instalacije, jer je potrebna za 'postinstall' skriptu
COPY prisma ./prisma/

# Instaliramo build-dependencies potrebne za bcrypt i native module
RUN apk add --no-cache python3 make g++
# Instaliramo SVE ovisnosti, uključujući devDependencies za build proces
RUN npm install

# Kopiramo ostatak koda aplikacije
COPY . .

# Eksplicitno pokrećemo build skriptu koja uključuje 'prisma generate' i 'tsc'
RUN npm run build

# Faza 2: Production - Ovdje stvaramo konačnu, optimiziranu sliku
FROM node:20-alpine

WORKDIR /usr/src/app

# Kopiramo package.json i package-lock.json (dobra praksa, može zatrebati za pokretanje skripti)
COPY package*.json ./

# Kopiramo SVE instalirane ovisnosti iz 'builder' faze umjesto ponovne instalacije
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Kopiramo izgrađenu aplikaciju iz 'builder' faze
COPY --from=builder /usr/src/app/dist ./dist

# Kopiramo Prisma shemu i migracije za 'prisma migrate deploy'
COPY --from=builder /usr/src/app/prisma ./prisma

# Izlažemo port
EXPOSE 3001

# Naredba za pokretanje: prvo migracije, zatim start aplikacije
# Koristimo 'node_modules/.bin/prisma' za direktno pozivanje
CMD [ "sh", "-c", "npx prisma migrate reset --force && npx prisma migrate deploy && npm run prisma:seed && npm start" ]
