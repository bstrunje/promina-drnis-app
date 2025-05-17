# Dashboard komponente

Ovaj direktorij sadrži komponente za administratorsku kontrolnu ploču (dashboard) aplikacije Promina-Drnis.

## Struktura

Glavna komponenta je `AdminDashboard.tsx` koja je podijeljena na sljedeće manje komponente:

### Glavne komponente

- `AdminDashboard.tsx` - Glavna komponenta koja objedinjuje sve ostale komponente
- `components/` - Direktorij s podkomponentama

### Podkomponente

- `DashboardHeader.tsx` - Zaglavlje kontrolne ploče
- `DashboardNavCards.tsx` - Navigacijske kartice za upravljanje članovima, aktivnostima i porukama
- `StampInventoryManager.tsx` - Komponenta za upravljanje inventarom markica
- `StampTypeCard.tsx` - Kartica koja prikazuje informacije o određenom tipu markice
- `StampHistorySection.tsx` - Sekcija koja prikazuje povijest inventara markica
- `ArchiveDialog.tsx` - Dijalog za arhiviranje inventara markica
- `types.ts` - Definicije tipova koje se koriste u dashboard komponentama

## Funkcionalnosti

### Upravljanje inventarom markica

Sustav omogućuje:
- Pregled trenutnog stanja inventara markica (zaposleni, studenti, umirovljenici)
- Uređivanje inventara (samo za superuser korisnike)
- Arhiviranje inventara na kraju godine
- Pregled povijesti inventara

### Navigacija

Kroz navigacijske kartice korisnik može pristupiti:
- Upravljanju članovima
- Upravljanju aktivnostima
- Porukama

### Poruke

Sustav prikazuje indikator nepročitanih poruka i omogućuje pristup sustavu za poruke.

## Tipovi podataka

Glavni tipovi podataka definirani u `types.ts`:

- `StampTypeData` - Podaci o pojedinom tipu markice
- `YearlyInventory` - Godišnji inventar markica
- `StampInventory` - Ukupni inventar markica
- `StampHistoryItem` - Stavka povijesti inventara markica
- `AdminMessage` - Poruka za administratora
- `ArchiveResult` - Rezultat arhiviranja inventara

## Najbolje prakse

1. Koristiti `void` operator za asinkrone funkcije koje se koriste kao event handleri
2. Eksplicitno definirati tipove za rezultate API poziva
3. Koristiti eksplicitne tipove za rezultate `JSON.parse(JSON.stringify())` operacija
4. Izbjegavati prazne funkcije u cleanup funkcijama useEffect-a
