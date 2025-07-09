# Plan Refaktoriranja: `member.controller.ts`

Ovaj dokument prati proces refaktoriranja datoteke `member.controller.ts` s ciljem smanjenja njene veličine i poboljšanja modularnosti koda.

## Status: U tijeku

---

## Koraci

- [x] **Korak 1: Premještanje funkcija u postojeće kontrolere**
    - [x] Premjestiti logiku za članarine u `membership.controller.ts`
        - `updateMembership`
        - `updateMembershipHistory`
        - `terminateMembership`
        - `updateMembershipEndReason`
        - `issueStamp`
    - [x] Premjestiti logiku za iskaznice u `cardnumber.controller.ts`
        - [x] `assignCardNumber`

- [x] **Korak 2: Kreiranje novih, specijaliziranih kontrolera**
    - [x] Kreirati `memberProfile.controller.ts` i premjestiti funkcije
        - `updateMember`
        - `updateMemberRole`
        - `uploadProfileImage`
        - `deleteProfileImage`
        - `assignPassword`
    - [x] Kreirati `memberStats.controller.ts` i premjestiti funkcije
        - `getMemberDashboardStats`
        - `getMemberStats`
        - `getMemberAnnualStats`
        - `getMemberWithActivities`

- [x] **Korak 3: Finalizacija `member.controller.ts`**
    - [x] Ostaviti samo osnovne CRUD operacije
        - `getAllMembers`
        - `getMemberById`
        - `createMember`
        - `getMemberDetails`

- [x] **Korak 4: Ažuriranje ruta**
    - [ ] Ažurirati `backend/src/routes/members.ts` i druge rute da koriste nove kontrolere.

- [x] **Korak 5: Verifikacija**
    - [ ] Pokrenuti aplikaciju i testirati funkcionalnosti kako bi se osiguralo da sve radi ispravno.