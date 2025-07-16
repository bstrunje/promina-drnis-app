# Faza 1: Builder - Ovdje gradimo aplikaciju
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Kopiramo package.json i package-lock.json
COPY package*.json ./

# Kopiramo Prisma shemu PRIJE instalacije, jer je potrebna za 'postinstall' skriptu
COPY prisma ./prisma/

# Instaliramo SVE ovisnosti, uključujući devDependencies za build proces
RUN npm install

# Kopiramo ostatak koda aplikacije
COPY . .

# Eksplicitno pokrećemo build skriptu koja uključuje 'prisma generate' i 'tsc'
RUN npm run build

# Faza 2: Production - Ovdje stvaramo konačnu, optimiziranu sliku
FROM node:20-alpine

WORKDIR /usr/src/app

# Kopiramo package.json i package-lock.json
COPY package*.json ./

# Kopiramo Prisma shemu PRIJE instalacije, jer je potrebna za 'postinstall' skriptu
COPY --from=builder /usr/src/app/prisma ./prisma

# Instaliramo SAMO produkcijske ovisnosti
RUN npm install

# Kopiramo izgrađenu aplikaciju iz 'builder' faze
COPY --from=builder /usr/src/app/dist ./dist

# Kopiramo node_modules za Prisma client koji je potreban u runtime-u
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma

# Izlažemo port
EXPOSE 3001

# Naredba za pokretanje: prvo migracije, zatim start aplikacije
# Koristimo 'node_modules/.bin/prisma' za direktno pozivanje
CMD [ "sh", "-c", "npx prisma migrate deploy && npm start" ]
