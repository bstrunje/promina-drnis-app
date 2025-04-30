# Custom hookovi za upravljanje članovima

Ovaj direktorij sadrži React custom hookove za dohvat i manipulaciju podataka o članovima.

## Dostupni hookovi

- **useMemberData.ts** - Hook za dohvat članova i njihovih detalja, te za osnovne operacije (dodavanje, uređivanje, brisanje)
- **useFilteredMembers.ts** - Hook za filtriranje i sortiranje liste članova

## Terminologija

### useMemberData

- **membershipStatus** - Osnovni status člana (registered/inactive/pending), odgovara stupcu "ČLANSTVO" u tablici
- **isActive** - Boolean vrijednost koja označava je li član aktivan (ima plaćenu članarinu i aktivan period)
- **detailedStatus** - Objekt koji sadrži detaljnije informacije o statusu članstva, uključujući razlog i prioritet
- **feeStatus** - Status plaćanja članarine (current/payment required)

### useFilteredMembers

- **activeFilter** - Filter za aktivne/pasivne članove
- **ageFilter** - Filter za dobne skupine (svi/punoljetni)
- **sortCriteria** - Kriterij sortiranja (name/hours)
- **sortOrder** - Redoslijed sortiranja (asc/desc)
- **groupByType** - Opcija za grupiranje članova prema tipu
