# Komponente za upravljanje članovima

Ovaj direktorij sadrži React komponente za prikaz, uređivanje i filtriranje članova.

## Glavne komponente

- **MemberList.tsx** - Glavna komponenta koja koordinira prikaz liste članova, koristi modularni pristup
- **MemberTable.tsx** - Komponenta za prikaz tablice s podacima članova
- **MemberListFilters.tsx** - Komponenta za pretraživanje i filtriranje članova
- **StatisticsView.tsx** - Komponenta za prikaz statistike članstva

## Terminologija komponenti

### MemberTable komponenta

- **KATEGORIJA** - Stupac koji prikazuje osnovni status članstva (Pending/Registered/Inactive)
- **Članstvo važeće** - Status za članove s aktivnim članstvom (ranije "Aktivan")
- **Neaktivan** - Status za članove kojima je članstvo prestalo
- **Na čekanju** - Status za članove čije članstvo još nije započelo

### StatisticsView komponenta

- **Aktivni članovi** - Članovi s plaćenom članarinom i aktivnim periodom članstva
- **Pasivni članovi** - Članovi bez plaćene članarine ili s neaktivnim periodom članstva
