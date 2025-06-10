# Autentifikacija i autorizacija

Ovaj dokument opisuje sustav autentifikacije i autorizacije implementiran u Promina Drniš aplikaciji.

## Pregled

Sustav autentifikacije i autorizacije omogućuje:
- Sigurnu prijavu članova i administratora
- Različite razine pristupa bazirane na ulogama
- Zaštitu osjetljivih API ruta
- Upravljanje sesijama

## Uloge korisnika

Aplikacija podržava tri glavne uloge:

```typescript
type MemberRole = 'member' | 'member_administrator' | 'member_superuser';
```

### Hijerarhija pristupa

1. **member** - Osnovni pristup za članove društva
   - Može vidjeti vlastite podatke
   - Može vidjeti ograničeni set informacija o aktivnostima
   - Ne može uređivati podatke drugih članova

2. **member_administrator** - Administratorski pristup
   - Sve mogućnosti običnog člana
   - Upravlja članovima (dodavanje, uređivanje, brisanje)
   - Upravlja članarinama
   - Upravlja aktivnostima
   - Pristupa izvještajima

3. **member_superuser** - Najviša razina pristupa
   - Sve mogućnosti administratora
   - Konfigurira postavke sustava
   - Upravlja korisničkim ulogama
   - Pristupa osjetljivim operacijama (brisanje podataka, izvoz podataka)

## Implementacija na frontendu

### AuthContext

Za upravljanje stanjem autentifikacije koristi se React Context koji omogućuje dijeljenje informacija o prijavljenom korisniku kroz cijelu aplikaciju:

```tsx
// AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../utils/api';
import { Member } from '@shared/member';

interface AuthContextType {
  currentUser: Member | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperUser: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!currentUser;
  const isAdmin = currentUser?.role === 'member_administrator' || currentUser?.role === 'member_superuser';
  const isSuperUser = currentUser?.role === 'member_superuser';

  // Provjera postojećeg tokena pri učitavanju
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          await refreshUserData();
        } catch (error) {
          console.error('Auth token expired or invalid:', error);
          localStorage.removeItem('auth_token');
          delete api.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const refreshUserData = async () => {
    try {
      const response = await api.get('/api/auth/me');
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      setCurrentUser(null);
      throw error;
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await api.post('/api/auth/login', { username, password });
      const { token, user } = response.data;
      
      localStorage.setItem('auth_token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setCurrentUser(user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    delete api.defaults.headers.common['Authorization'];
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      isAuthenticated,
      isAdmin,
      isSuperUser,
      loading,
      login,
      logout,
      refreshUserData
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### Zaštita ruta

Za zaštitu frontend ruta koristi se ProtectedRoute komponenta:

```tsx
// ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type ProtectedRouteProps = {
  children: React.ReactNode;
  adminOnly?: boolean;
  superUserOnly?: boolean;
};

export const ProtectedRoute = ({ 
  children, 
  adminOnly = false, 
  superUserOnly = false 
}: ProtectedRouteProps) => {
  const { isAuthenticated, isAdmin, isSuperUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Učitavanje...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (superUserOnly && !isSuperUser) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
```

## Implementacija na backendu

### JWT autentifikacija

Backend koristi JSON Web Tokens (JWT) za autentifikaciju:

```typescript
// auth.controller.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const TOKEN_EXPIRY = '24h';

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  try {
    // Provjera korisnika (username je zapravo full_name)
    const user = await prisma.member.findFirst({
      where: { 
        full_name: username,
        registration_completed: true
      }
    });

    if (!user || !user.password_hash) {
      return res.status(401).json({ message: 'Neispravno korisničko ime ili lozinka' });
    }

    // Provjera lozinke
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ message: 'Neispravno korisničko ime ili lozinka' });
    }

    // Generiranje JWT tokena
    const token = jwt.sign(
      { member_id: user.member_id, role: user.role || 'member' },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    // Ažuriranje zadnje prijave
    await prisma.member.update({
      where: { member_id: user.member_id },
      data: { last_login: new Date() }
    });

    // Uklanjanje osjetljivih podataka prije slanja
    const { password_hash, ...userWithoutPassword } = user;

    return res.json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Greška prilikom prijave' });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const member_id = req.user?.member_id;
    
    if (!member_id) {
      return res.status(401).json({ message: 'Korisnik nije autentificiran' });
    }

    const user = await prisma.member.findUnique({
      where: { member_id }
    });

    if (!user) {
      return res.status(404).json({ message: 'Korisnik nije pronađen' });
    }

    // Uklanjanje osjetljivih podataka
    const { password_hash, ...userWithoutPassword } = user;

    return res.json(userWithoutPassword);
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ message: 'Greška prilikom dohvaćanja korisnika' });
  }
};
```

### Middleware za autentifikaciju

Za zaštitu API ruta koristi se middleware:

```typescript
// auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Proširenje Request tipa s poljima korisnika
declare global {
  namespace Express {
    interface Request {
      user?: {
        member_id: number;
        role: string;
      };
    }
  }
}

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Neispravan ili istekao token' });
      }

      req.user = decoded as { member_id: number; role: string };
      next();
    });
  } else {
    res.status(401).json({ message: 'Autorizacijski token nije pronađen' });
  }
};

// Middleware za provjeru admin prava
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && (req.user.role === 'member_administrator' || req.user.role === 'member_superuser')) {
    next();
  } else {
    res.status(403).json({ message: 'Pristup odbijen: Potrebna admin prava' });
  }
};

// Middleware za provjeru superuser prava
export const requireSuperUser = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'member_superuser') {
    next();
  } else {
    res.status(403).json({ message: 'Pristup odbijen: Potrebna superuser prava' });
  }
};
```

### Registracija ruta s autentifikacijom

Primjer kako su zaštićene rute registrirane u Express aplikaciji:

```typescript
// routes/members.ts
import express from 'express';
import * as memberController from '../controllers/member.controller';
import { authenticateJWT, requireAdmin, requireSuperUser } from '../middleware/auth.middleware';

const router = express.Router();

// Javne rute (bez autentifikacije)
router.post('/register', memberController.registerMember);

// Rute koje zahtijevaju autentifikaciju
router.get('/profile', authenticateJWT, memberController.getMemberProfile);

// Rute koje zahtijevaju admin prava
router.get('/', authenticateJWT, requireAdmin, memberController.getAllMembers);
router.post('/', authenticateJWT, requireAdmin, memberController.createMember);
router.put('/:id', authenticateJWT, requireAdmin, memberController.updateMember);

// Rute koje zahtijevaju superuser prava
router.delete('/:id', authenticateJWT, requireSuperUser, memberController.deleteMember);

export default router;
```

## Registracija i upravljanje korisnicima

### Proces registracije

Registracija novih članova zahtijeva sljedeće korake:

1. Nakon registracije novi član je u statusu "pending" ("Na čekanju")dok mu admin ne dodijeli broj kartice, tada postaje "regular" ("Redovni član")
2. Dodjelom broja kartice formira se lozinka zadanog formata full_name-isk-broj kartice
3. Prijavu u sustav član (novi ili stari)  može napraviti tek ako je članarina plaćena

### Resetiranje lozinke

Sustav podržava resetiranje zaboravljene lozinke kroz:
1. Lozinka se mijenja promjenom broja članske iskaznice

## Sigurnosne mjere

### Pohrana lozinki

Lozinke se nikada ne pohranjuju u izvornom obliku. Umjesto toga:
- Koristi se bcrypt za sigurno hashiranje lozinki
- Implementirano je automatsko salt generiranje
- Primjenjuju se najbolje prakse za otpornost na napade rječnikom i brute force

### Zaštita API-ja

API rute su zaštićene od neželjenog pristupa kroz:
- Rate limiting za sprječavanje brute force napada
- Helmet middleware za sigurnost HTTP zaglavlja
- Validaciju ulaznih podataka za sprječavanje injekcijskih napada
- CORS konfiguraciju za kontrolu pristupa

### JWT Refresh Token sustav

Aplikacija koristi robustan JWT refresh token sustav za sigurniju autentikaciju i bolje korisničko iskustvo.

#### Arhitektura sustava

1. **Access Token**
   - Kratkog trajanja (15 minuta)
   - Koristi se za pristup zaštićenim rutama
   - Potpisan s JWT_SECRET ključem
   - Sadrži ID korisnika i ulogu

2. **Refresh Token**
   - Dugog trajanja (7 dana)
   - Koristi se za dobivanje novog access tokena
   - Potpisan s REFRESH_TOKEN_SECRET ključem (odvojeni ključ za bolju sigurnost)
   - Pohranjuje se u bazi podataka u tablici `refresh_tokens`
   - Šalje se klijentu kao HTTP-only kolačić
   - Izolirani kolačići za različite tipove korisnika:
     - `refreshToken` za članove s putanjom `/api/auth`
     - `systemManagerRefreshToken` za administratore sustava s putanjom `/api/system-manager`

#### Implementacija na backendu

```typescript
// Generiranje tokena pri prijavi
const token = jwt.sign(
  { id: member.member_id, role: member.role },
  JWT_SECRET,
  { expiresIn: "15m" }
);

// Generiranje refresh tokena
const refreshToken = jwt.sign(
  { id: member.member_id, role: member.role },
  REFRESH_TOKEN_SECRET,
  { expiresIn: "7d" }
);

// Pohrana refresh tokena u bazu
await prisma.refresh_tokens.create({
  data: {
    token: refreshToken,
    member_id: member.member_id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }
});

// Postavljanje refresh tokena kao HTTP-only kolačića
res.cookie('refreshToken', refreshToken, { 
  httpOnly: true, 
  secure: process.env.NODE_ENV === 'production' || protocol === 'https',
  sameSite: isDevelopment ? 'lax' : (process.env.COOKIE_DOMAIN ? 'none' : 'strict'),
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dana
  path: '/api/auth' // Ograničeno na /api/auth putanju
});

// Brisanje systemManagerRefreshToken kolačića ako postoji
// kako bi se izbjegao konflikt između dva tipa tokena
if (req.cookies.systemManagerRefreshToken) {
  res.clearCookie('systemManagerRefreshToken', { 
    path: '/api/system-manager' 
  });
}
```

#### Token rotacija

Implementirana je token rotacija koja generira novi refresh token pri svakom obnavljanju access tokena, što povećava sigurnost sustava:

```typescript
// Implementacija token rotation - generiranje novog refresh tokena
const newRefreshToken = jwt.sign(
  { id: member.member_id, role: member.role }, 
  REFRESH_TOKEN_SECRET, 
  { expiresIn: '7d' }
);

// Ažuriranje refresh tokena u bazi
await prisma.refresh_tokens.update({
  where: { id: storedToken.id },
  data: {
    token: newRefreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }
});
```

#### Rute za autentikaciju

```typescript
// Nove rute za refresh token mehanizam
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
```

#### Izolacija tokena za različite tipove korisnika

Aplikacija podržava dvije vrste korisničkih uloga koje koriste odvojene autentikacijske tokene:

1. **Članovi** (member, member_administrator, member_superuser)
   - Koriste `refreshToken` kolačić s putanjom `/api/auth`
   - Endpoint za osvježavanje: `/api/auth/refresh`

2. **Administratori sustava** (SystemManager)
   - Koriste `systemManagerRefreshToken` kolačić s putanjom `/api/system-manager`
   - Endpoint za osvježavanje: `/api/system-manager/refresh-token`

**Sprječavanje konflikata tokena:**

- Kolačići su izolirani na različitim putanjama kako bi se spriječilo da se šalju na pogrešne endpointe
- Prilikom prijave ili osvježavanja tokena jednog tipa korisnika, automatski se briše kolačić drugog tipa korisnika
- Frontend implementacija briše oba tipa kolačića prilikom odjave
- Axios instance za različite tipove korisnika koriste odvojene interceptore za osvježavanje tokena

```typescript
// Primjer brisanja konfliktnih kolačića u auth.controller.ts
if (req.cookies.systemManagerRefreshToken) {
  console.log('Brišem systemManagerRefreshToken kolačić za izbjegavanje konflikta');
  res.clearCookie('systemManagerRefreshToken', { 
    path: '/api/system-manager' 
  });
}
```

#### Prednosti implementacije

1. **Poboljšana sigurnost**
   - Kraće trajanje access tokena smanjuje rizik od zlouporabe ukradenog tokena
   - HTTP-only kolačići za refresh tokene štite od XSS napada
   - Token rotacija onemogućuje korištenje istog refresh tokena više puta
   - Izolacija tokena sprječava konflikte između različitih tipova korisnika

2. **Bolje korisničko iskustvo**
   - Korisnici se ne moraju često prijavljivati
   - Automatsko obnavljanje tokena u pozadini
   - Sigurna odjava koja poništava refresh token
   - Mogućnost istovremenog rada s različitim tipovima korisničkih računa

### Sigurnosna najbolja praksa

1. Access tokeni se spremaju u memoriji aplikacije, a refresh tokeni u HTTP-only kolačićima
2. Osjetljivi podaci se filtriraju prije slanja na frontend
3. Validacija se provodi i na frontendu i na backendu
4. Implementirane su provjere duljine i kompleksnosti lozinke
5. Koriste se različiti tajni ključevi za access i refresh tokene

## Primjeri korištenja

### Prijava na frontend sučelju

```tsx
// LoginForm.tsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Dohvati originalno odredište ako postoji
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Greška prilikom prijave');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      
      <div>
        <label htmlFor="username">Korisničko ime</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
      
      <div>
        <label htmlFor="password">Lozinka</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      
      <button type="submit">Prijava</button>
    </form>
  );
}
```

### Provjera autorizacije u komponenti

```tsx
// AdminPanel.tsx
import { useAuth } from '../context/AuthContext';

export function AdminPanel() {
  const { isAdmin, isSuperUser } = useAuth();
  
  if (!isAdmin) {
    return <div>Pristup zabranjen. Potrebna su administratorska prava.</div>;
  }
  
  return (
    <div>
      <h1>Admin Panel</h1>
      
      {/* Funkcionalnosti dostupne svim administratorima */}
      <section>
        <h2>Upravljanje članovima</h2>
        {/* ... */}
      </section>
      
      {/* Funkcionalnosti dostupne samo superuserima */}
      {isSuperUser && (
        <section>
          <h2>Napredne postavke sustava</h2>
          {/* ... */}
        </section>
      )}
    </div>
  );
}
```

## Buduća poboljšanja

Za poboljšanje sustava autentifikacije i autorizacije razmotrite:

1. **Implementacija refresh tokena** - Za duže sesije bez ponovnih prijava
2. **Dvofaktorska autentifikacija** - Za povećanu sigurnost
3. **Detaljniji sustav dozvola** - Za finije upravljanje pristupom
4. **Zapisivanje sigurnosnih događaja** - Za bolju reviziju
5. **Naprednije strategije za lozinke** - Provjera curenja lozinki, pravila kompleksnosti
