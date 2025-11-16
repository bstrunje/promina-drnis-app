# 🔧 REFRESH TOKEN RACE CONDITION FIX - PRODUKCIJA

## 🚨 PROBLEM IDENTIFICIRAN

### Simptomi:
- **Konstantni 401 errori** na `/api/auth/refresh` u produkciji (Vercel)
- Poruka: `"Refresh token nije pronađen u bazi za korisnika ID: 2"`
- **Ne pojavljuje se lokalno**, samo u serverless okruženju
- Dešava se vrlo često (svaka 2-5 sekundi prema logovima)

### Izvještaj iz produkcije:
```
Nov 09 09:52:47 POST 401 /api/auth/refresh - "Refresh token nije pronađen u bazi za korisnika ID: 2"
Nov 09 09:52:45 POST 401 /api/auth/refresh - "Refresh token nije pronađen u bazi za korisnika ID: 2"
Nov 09 09:52:43 POST 401 /api/auth/refresh - "Refresh token nije pronađen u bazi za korisnika ID: 2"
Nov 09 09:52:38 POST 401 /api/auth/refresh - "Refresh token nije pronađen u bazi za korisnika ID: 2"
```

---

## 🔍 ROOT CAUSE ANALIZA

### Uzrok: Race Condition u Serverless Okruženju

**Stara logika u `refreshToken.handler.ts` (linije 163-189):**

```typescript
// 1. KREIRA novi token
const newTokenRecord = await prisma.refresh_tokens.create({
  data: { token: newRefreshToken, member_id: member.member_id, expires_at: expiresAt }
});

// 2. BRIŠE stare tokene (90s grace period)
await prisma.refresh_tokens.deleteMany({
  where: {
    member_id: member.member_id,
    token: { not: newRefreshToken },
    created_at: { lt: graceCutoff }  // ❌ Samo 90 sekundi grace
  }
});
```

### Race Condition Scenarij:

1. **T=0ms** - Frontend pošalje refresh zahtjev → **Serverless funkcija A** (cold start, latencija ~3s)
2. **T=50ms** - Drugi API poziv (npr. unread-count) traži refresh → **Serverless funkcija B** (cold start, latencija ~3s)
3. **T=3000ms** - **Funkcija A**: Kreira novi token `TOKEN_123`
4. **T=3100ms** - **Funkcija B**: Istovremeno kreira drugi novi token `TOKEN_124` za istog korisnika
5. **T=3200ms** - **Funkcija A**: Briše sve stare tokene osim `TOKEN_123` → **slučajno obriše TOKEN_124** (jer je stariji od 90s grace cutoff-a)
6. **T=3300ms** - Frontend dobije `TOKEN_124` u cookie-u
7. **T=20000ms** - Sljedeći refresh pokušaj s `TOKEN_124` → **Token nije u bazi** → **401 Error** ❌

---

## ✅ RJEŠENJE IMPLEMENTIRANO

### 1. **Povećan Grace Period: 90s → 10 minuta**

**Razlog:** Serverless funkcije imaju:
- Cold start latenciju (2-5 sekundi)
- Paralelne zahtjeve koji se preklapaju
- Mrežnu latenciju između serverless instanci

**Novo:**
```typescript
const GRACE_MS = 10 * 60 * 1000; // 10 minuta grace period
```

---

### 2. **Promijenjen Redoslijed Operacija**

**Prije:**
1. Kreira novi token
2. Briše stare tokene → **Može obrisati upravo kreirani token drugog zahtjeva**

**Poslije:**
1. **PRVO**: Obriši stare tokene (izvan grace period-a)
2. **DRUGO**: Kreira novi token
3. **TREĆE**: Obriši samo token koji je upravo korišten

```typescript
// PRVO: Čisti stare tokene PRIJE kreiranja novog
await prisma.refresh_tokens.deleteMany({
  where: {
    member_id: member.member_id,
    token: { not: refreshToken }, // Zadrži TRENUTNI token
    created_at: { lt: graceCutoff }
  }
});

// DRUGO: Kreira novi token
const newTokenRecord = await prisma.refresh_tokens.create({...});

// TREĆE: Obriši samo stari token
await prisma.refresh_tokens.deleteMany({
  where: {
    member_id: member.member_id,
    token: refreshToken, // Samo token koji je upravo korišten
    id: { not: newTokenRecord.id }
  }
});
```

---

### 3. **Limit Tokena po Korisniku (Multi-Device Support)**

**Problem:** Bez limita, korisnik može akumulirati stotine tokena ako često refresha.

**Rješenje:** Maksimalno 5 aktivnih tokena po korisniku:

```typescript
const tokenCount = await prisma.refresh_tokens.count({
  where: { member_id: member.member_id }
});

if (tokenCount > 5) {
  const oldestTokens = await prisma.refresh_tokens.findMany({
    where: { member_id: member.member_id },
    orderBy: { created_at: 'asc' },
    take: tokenCount - 5
  });
  
  await prisma.refresh_tokens.deleteMany({
    where: { id: { in: oldestTokens.map(t => t.id) } }
  });
}
```

**Benefiti:**
- Podržava 5 različitih uređaja istovremeno
- Automatski briše najstarije tokene
- Sprječava akumulaciju tokena u bazi

---

## 📝 DATOTEKE MODIFICIRANE

### 1. `backend/src/controllers/auth/refreshToken.handler.ts`
- ✅ Povećan grace period na 10 minuta
- ✅ Promijenjen redoslijed: briši stare → kreiraj novi → briši korišteni
- ✅ Dodan limit od 5 tokena po korisniku

### 2. `backend/src/controllers/auth/login.handler.ts`
- ✅ Povećan grace period na 10 minuta
- ✅ Dodana OR logika: istekli tokeni ILI stari tokeni
- ✅ Dodan limit od 5 tokena po korisniku

### 3. `backend/src/controllers/auth/twofa.handlers.ts`
- ✅ Povećan grace period na 10 minuta
- ✅ Dodana OR logika za brisanje tokena
- ✅ Dodan limit od 5 tokena po korisniku

---

## 🚀 DEPLOYMENT PLAN

### 1. **Build Backend:**
```powershell
cd backend
npm run build
```

### 2. **Test Lokalno (ako želiš):**
```powershell
npm start
# Provjeri logs za [REFRESH-TOKEN] poruke
```

### 3. **Deploy na Vercel:**
```powershell
cd ..
git add .
git commit -m "fix: Riješen race condition u refresh token logici za serverless okruženje

- Povećan grace period s 90s na 10 minuta za serverless latenciju
- Promijenjen redoslijed: briši stare → kreiraj novi → briši korišteni
- Dodan limit od 5 aktivnih tokena po korisniku (multi-device support)
- Primjenjeno na login, refresh i 2FA handlere"

git push
```

### 4. **Praćenje Produkcijskih Logova:**

Nakon deploya, prati Vercel logove za:
- ✅ `[REFRESH-TOKEN] Pre-cleanup: obrisano X starih tokena`
- ✅ `[REFRESH-TOKEN] Novi token kreiran s ID: XXX`
- ✅ `[REFRESH-TOKEN] Post-cleanup: obrisan stari token`
- ✅ `[REFRESH-TOKEN] Potvrda: novi token je u bazi`

**Što NE bi trebalo vidjeti:**
- ❌ `Refresh token nije pronađen u bazi za korisnika ID: X`
- ❌ 401 errori na `/api/auth/refresh`

---

## 📊 OČEKIVANI REZULTATI

### Prije:
- 🔴 401 errori svakih 2-5 sekundi
- 🔴 Korisnici se moraju stalno ponovno prijavljivati
- 🔴 Race conditions u paralelnim zahtjevima

### Poslije:
- ✅ Nema 401 errora na refresh endpoint
- ✅ Stabilna autentikacija u serverless okruženju
- ✅ Podrška za 5 uređaja istovremeno
- ✅ Automatsko čišćenje starih tokena
- ✅ Otpornost na paralelne zahtjeve

---

## 🔒 SIGURNOSNE NAPOMENE

### Grace Period od 10 Minuta:
- **Je li sigurno?** DA ✅
- Tokeni su i dalje vezani za:
  - JWT expiry (7 dana)
  - Device fingerprint (user-agent + IP)
  - Database verification
- Grace period samo sprječava preuranjeno brisanje tokena u race condition scenariju

### Limit od 5 Tokena:
- **Zašto 5?** Razumna podrška za:
  - Desktop računalo
  - Laptop
  - Mobitel
  - Tablet
  - Backup uređaj
- **Što se dešava s 6. uređajem?** Automatski se briše najstariji token

---

## 🧪 TESTIRANJE

### Lokalno:
```powershell
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Simuliraj paralelne zahtjeve
# Otvori više browsera tab-ova i refreshaj stranicu istovremeno
```

### U Produkciji:
1. Deploy na Vercel
2. Provjeri Vercel logove za `[REFRESH-TOKEN]` poruke
3. Otvori aplikaciju u više browsera/uređaja
4. Provjeri da nema 401 errora u Network tab-u

---

## 📞 PODRŠKA

Ako i dalje ima problema nakon deploya:
1. Provjeri Vercel logove za KRITIČNA GREŠKA poruke
2. Provjeri da li postoje još koji 401 errori
3. Provjeri broj tokena u bazi:
   ```sql
   SELECT member_id, COUNT(*) as token_count 
   FROM refresh_tokens 
   GROUP BY member_id 
   ORDER BY token_count DESC;
   ```

---

**Datum:** 2024-11-09  
**Verzija:** 1.0  
**Status:** ✅ SPREMNO ZA DEPLOYMENT
