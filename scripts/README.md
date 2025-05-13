# Skripte za standardizaciju datuma

Ovaj direktorij sadrži skripte za standardizaciju korištenja datuma u Promina-Drnis aplikaciji prema smjernicama iz dokumentacije `docs/date-time-standardization.md`.

## Dostupne skripte

### 1. date-standardization.js

Ova skripta analizira kod i identificira mjesta gdje se datumi ne koriste prema standardima. Može automatski ispraviti probleme ako se pokrene s opcijom `--fix`.

**Obrasci koje skripta traži:**
- Direktno korištenje `new Date()` umjesto `getCurrentDate()`
- Korištenje `toLocaleString('hr-HR')` umjesto `formatDate()`
- Korištenje `toISOString()` umjesto `formatDate()`
- Direktno parsiranje datuma s `new Date(string)` umjesto `parseDate()`

**Pokretanje:**
```bash
# Samo analiza (bez promjena)
node date-standardization.js

# Analiza s detaljnijim ispisom
node date-standardization.js --verbose

# Simulacija ispravaka (bez stvarnih promjena)
node date-standardization.js --dry-run

# Automatsko ispravljanje problema
node date-standardization.js --fix
```

### 2. date-standardization-fixes.js

Ova skripta implementira specifične ispravke za problematične slučajeve koji zahtijevaju složeniju logiku nego što je moguće automatski detektirati.

**Specifični slučajevi koje skripta ispravlja:**
- Zamjena `new Date()` s `getCurrentDate()` u ključnim komponentama
- Zamjena `new Date().getFullYear()` s `getCurrentYear()`
- Zamjena `toLocaleDateString` i `toISOString` s `formatDate`
- Dodavanje nedostajućih importa za funkcije iz `dateUtils`

**Pokretanje:**
```bash
# Samo analiza (bez promjena)
node date-standardization-fixes.js

# Simulacija ispravaka (bez stvarnih promjena)
node date-standardization-fixes.js --dry-run

# Automatsko ispravljanje problema
node date-standardization-fixes.js --fix
```

## Preporučeni postupak standardizacije

1. Prvo pokrenite `date-standardization.js` bez opcija da vidite analizu problema
2. Pokrenite `date-standardization-fixes.js` bez opcija za provjeru specifičnih slučajeva
3. Pokrenite `date-standardization.js --dry-run` da vidite koje bi promjene bile napravljene
4. Pokrenite `date-standardization-fixes.js --dry-run` da vidite koje bi specifične promjene bile napravljene
5. Ako ste zadovoljni predloženim promjenama, pokrenite:
   ```bash
   node date-standardization.js --fix
   node date-standardization-fixes.js --fix
   ```

## Napomene

- Skripte će automatski dodati potrebne importe za funkcije iz `dateUtils`
- Skripte ne mijenjaju kod unutar `dateUtils.ts` datoteka
- Skripte preskaču komentare i ne mijenjaju ih
- Za složenije slučajeve možda će biti potrebno ručno prilagoditi kod
