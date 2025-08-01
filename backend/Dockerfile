# Faza 1: Builder - Ovdje gradimo aplikaciju
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Kopiramo package.json i package-lock.json
COPY package*.json ./

# Kopiramo Prisma shemu PRIJE instalacije, jer je potrebna za 'postinstall' skriptu
COPY prisma ./prisma/

# Instaliramo build-dependencies potrebne za bcrypt i native module
RUN apk add --no-cache openssl netcat-openbsd python3 make g++
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



# Instaliramo alate potrebne u produkcijskoj slici
RUN apk add --no-cache netcat-openbsd postgresql-client

# Kopiramo izgrađenu aplikaciju iz 'builder' faze
COPY --from=builder /usr/src/app/dist ./dist

# Kopiramo Prisma shemu i migracije za 'prisma migrate deploy'
COPY --from=builder /usr/src/app/prisma ./prisma

# Kopiramo i pripremamo entrypoint skriptu
COPY entrypoint.sh .
# Rješavamo problem s Windows (CRLF) vs Linux (LF) krajevima redova
RUN sed -i 's/\r$//' ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Postavljamo entrypoint skriptu kao ulaznu točku
ENTRYPOINT ["./entrypoint.sh"]

# Zadana naredba koju će entrypoint pokrenuti
CMD ["npm", "start"]

# Izlažemo port
EXPOSE 3001


