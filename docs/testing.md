# Testiranje i Mock Datum

Testiranje vremenski ovisnih funkcionalnosti je važan aspekt Promina-Drniš aplikacije. Ovaj dokument opisuje pristupe i alate implementirane za testiranje, s posebnim naglaskom na Mock Datum funkcionalnost.

## Mock Datum Funkcionalnost

### Pregled

Mock Datum je posebna funkcionalnost implementirana u aplikaciji koja omogućuje testiranje vremenski ovisnih značajki "putovanjem kroz vrijeme". Ovo je ključno za testiranje:

- Isteka članarina
- Aktivacije novih razdoblja članstva
- Statusa članstva na određene datume
- Isteka iskaznica

### Komponenta DateMockTool

Komponenta `DateMockTool` omogućuje administratorima simulaciju različitih datuma bez modificiranja sistemskog sata.

#### Ključne značajke

- Postavljanje proizvoljnog datuma za testiranje
- Vizualni indikator kad je simulirani datum aktivan
- Povratak na stvarni datum jednim klikom
- Praćenje promjena datuma u stvarnom vremenu
- Poboljšane validacije unosa datuma
- Jasne povratne informacije korisniku kad je simulacija aktivna

#### Implementacija

Komponenta koristi kontekst za dijeljenje simuliranog datuma kroz aplikaciju:

```tsx
// DateMockContext.tsx
import { createContext, useState, useContext, useEffect, ReactNode } from 'react';

interface DateMockContextType {
  mockedDate: Date | null;
  setMockedDate: (date: Date | null) => void;
  isDateMocked: boolean;
}

const DateMockContext = createContext<DateMockContextType | undefined>(undefined);

export const DateMockProvider = ({ children }: { children: ReactNode }) => {
  const [mockedDate, setMockedDate] = useState<Date | null>(null);
  const isDateMocked = mockedDate !== null;

  return (
    <DateMockContext.Provider value={{ mockedDate, setMockedDate, isDateMocked }}>
      {children}
    </DateMockContext.Provider>
  );
};

export const useDateMock = () => {
  const context = useContext(DateMockContext);
  if (context === undefined) {
    throw new Error('useDateMock must be used within a DateMockProvider');
  }
  return context;
};
```

#### DateMockTool komponenta

```tsx
// DateMockTool.tsx
import { useState, useEffect } from 'react';
import { format, isValid, parse } from 'date-fns';
import { useDateMock } from '../context/DateMockContext';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Alert, AlertDescription } from '@components/ui/alert';
import { useToast } from '@components/ui/use-toast';
import { Clock, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';

export function DateMockTool() {
  const { mockedDate, setMockedDate, isDateMocked } = useDateMock();
  const [dateInput, setDateInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Inicijalizacija inputa s trenutnim mock datumom ako postoji
  useEffect(() => {
    if (mockedDate) {
      setDateInput(format(mockedDate, 'yyyy-MM-dd'));
    }
  }, [mockedDate]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateInput(e.target.value);
    setError(null);
  };

  const handleSetMockDate = () => {
    // Validacija formata datuma (yyyy-MM-dd)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      setError('Neispravan format datuma. Koristite YYYY-MM-DD format.');
      return;
    }

    const parsedDate = parse(dateInput, 'yyyy-MM-dd', new Date());
    
    if (!isValid(parsedDate)) {
      setError('Neispravan datum. Provjerite unos.');
      return;
    }

    setMockedDate(parsedDate);
    toast({
      title: "Datum simuliran",
      description: `Simulirani datum postavljen na: ${format(parsedDate, 'dd.MM.yyyy')}`,
      variant: "default",
    });
  };

  const handleResetMockDate = () => {
    setMockedDate(null);
    setDateInput('');
    toast({
      title: "Simulacija isključena",
      description: "Koristi se stvarni sistemski datum.",
      variant: "default",
    });
  };

  return (
    <Card className={isDateMocked ? "border-red-500" : ""}>
      <CardHeader className={isDateMocked ? "bg-red-100" : ""}>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <span>Simulacija datuma</span>
          {isDateMocked && (
            <AlertCircle className="h-5 w-5 text-red-500 animate-pulse" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isDateMocked && (
          <Alert className="mb-4 bg-red-100 border-red-300">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Aktivna simulacija datuma: <strong>{format(mockedDate, 'dd.MM.yyyy.')}</strong>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              placeholder="YYYY-MM-DD"
              value={dateInput}
              onChange={handleDateChange}
              className={error ? "border-red-500" : ""}
            />
            <Button onClick={handleSetMockDate} type="button" variant="outline">
              <Clock className="mr-2 h-4 w-4" />
              Simuliraj
            </Button>
          </div>
          
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          
          {isDateMocked && (
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Stvarni datum: <strong>{format(new Date(), 'dd.MM.yyyy.')}</strong>
              </p>
              <Button onClick={handleResetMockDate} variant="outline" size="sm">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Isključi simulaciju
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Backend implementacija

Backend ima middleware koji prihvaća simulirani datum i koristi ga za operacije koje su osjetljive na datum:

```typescript
// testModeMiddleware.ts
import { Request, Response, NextFunction } from 'express';

interface RequestWithTestMode extends Request {
  isTestMode?: boolean;
  testDate?: Date;
}

export const testModeMiddleware = (req: RequestWithTestMode, res: Response, next: NextFunction) => {
  // Provjeri postoji li x-test-mode header
  const testMode = req.headers['x-test-mode'];
  const testDateHeader = req.headers['x-test-date'];

  if (testMode === 'true') {
    req.isTestMode = true;
    
    // Ako je poslan testni datum, koristi ga
    if (testDateHeader && typeof testDateHeader === 'string') {
      try {
        const testDate = new Date(testDateHeader);
        if (!isNaN(testDate.getTime())) {
          req.testDate = testDate;
        }
      } catch (error) {
        console.warn('Invalid test date format:', testDateHeader);
      }
    }
    
    console.log(`Test mode active${req.testDate ? `, using date: ${req.testDate.toISOString()}` : ''}`);
  }
  
  next();
};
```

### Integracija s API pozivima

Frontend automatski šalje simulirani datum s API pozivima kada je aktivna simulacija:

```typescript
// api.ts
import axios from 'axios';
import { useDateMock } from '../context/DateMockContext';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor koji dodaje testne headere kada je simulacija aktivna
api.interceptors.request.use((config) => {
  const { mockedDate, isDateMocked } = useDateMock();
  
  if (isDateMocked && mockedDate) {
    config.headers['x-test-mode'] = 'true';
    config.headers['x-test-date'] = mockedDate.toISOString();
  }
  
  return config;
});

export default api;
```

### Korištenje u repozitorijima

Backend repozitoriji koriste simulirani datum za operacije koje su osjetljive na vrijeme:

```typescript
// membership.repository.ts
export const updateMembershipPeriods = async (
  req: Request, 
  memberId: number, 
  periods: MembershipPeriod[]
) => {
  // Koristi testni datum ako je dostupan, inače trenutni datum
  const currentDate = (req as any).isTestMode && (req as any).testDate 
    ? new Date((req as any).testDate) 
    : new Date();
  
  // Logika za ažuriranje razdoblja članstva koristeći trenutni datum
  // ...
};
```

## Testni scenariji

Korištenjem Mock Datum funkcionalnosti, možete testirati sljedeće scenarije:

### 1. Testiranje isteka članarina

1. Postavite simulirani datum na kraj tekuće godine (npr. 31.12.2025.)
2. Provjerite koji su članovi označeni kao platili članarinu za tu godinu
3. Postavite datum na početak sljedeće godine (npr. 01.01.2026.)
4. Provjerite prikaz statusa članstva - članovi koji nisu platili novu članarinu trebali bi biti označeni kao "Neaktivni"

### 2. Testiranje razdoblja članstva

1. Kreirajte novo razdoblje članstva s određenim datumom završetka
2. Postavite simulirani datum nakon tog datuma završetka
3. Provjerite je li status člana ispravno prikazan kao neaktivan

### 3. Testiranje sistema iskaznica i markica

1. Postavite simulirani datum na početak nove godine
2. Provjerite prikaz za sljedeću godišnju markicu
3. Izdajte markicu za novu godinu i provjerite ažuriranje statusa

## Najbolje prakse za testiranje

### Sveobuhvatno testiranje

- Testirajte granične slučajeve (npr. prijelaz iz jedne godine u drugu)
- Testirajte sve moguće statuse članstva
- Testirajte sve kombinacije razdoblja članstva i plaćanja članarine

### Savjeti za testiranje

1. **Jasno označite kada je simulacija aktivna** - Vizualni indikatori pomažu izbjeći zabunu
2. **Vratite na stvarni datum nakon testiranja** - Izbjegavajte zaboraviti deaktivirati simulaciju
3. **Kreirajte test skripte** - Dokumentirajte korake za testiranje određenih scenarija
4. **Dokumentirajte pronađene greške** - Zabilježite sve probleme otkrivene tijekom testiranja

## Ograničenja

- Mock Datum simulacija utječe samo na funkcionalnosti koje su specifično implementirane da koriste testni datum
- Neki vanjski servisi ili biblioteke možda neće poštivati simulirani datum
- Testiranje u produkcijskom okruženju nije preporučljivo jer može dovesti do pogrešnih podataka

## Proširenje Mock Datum funkcionalnosti

Za buduća poboljšanja, razmotrite:

1. Zapisivanje povijesti simuliranih datuma
2. Automatizaciju scenarija testiranja
3. Dodavanje vremena (sati, minute) uz datum za još preciznija testiranja
4. Integraciju s automatiziranim testovima
