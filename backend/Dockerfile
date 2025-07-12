# Koristimo službenu Node.js 20 sliku kao bazu
FROM node:20-alpine

# Postavljamo radni direktorij unutar kontejnera
WORKDIR /usr/src/app

# Kopiramo package.json i package-lock.json
COPY package*.json ./

# Kopiramo Prisma shemu PRIJE instalacije, jer je potrebna za 'postinstall' skriptu
COPY prisma ./prisma/

# Instaliramo projektne ovisnosti (ovo će pokrenuti i 'prisma generate')
RUN npm install

# Kopiramo ostatak koda aplikacije
COPY . .

# Gradimo aplikaciju (prevodimo TypeScript u JavaScript)
RUN npm run build

# Izlažemo port na kojem aplikacija radi
EXPOSE 3001

# Definiramo naredbu za pokretanje aplikacije
# Prvo pokrećemo migracije da osiguramo da je baza ažurna, a zatim startamo server
CMD [ "sh", "-c", "npx prisma migrate deploy && npm start" ]
