// frontend/src/config/appSettings.ts
// Centralizirana konfiguracija branda/URL-ova koja se može prilagoditi per-deployment
// Ovdje su inicijalno vrijednosti za PD Promina; za drugi deployment samo promijeni URL-ove.

export const appSettings = {
  // URL službene web stranice udruge/kluba (nije URL ove aplikacije)
  orgWebsiteUrl: 'https://www.pd-promina.hr',
  documents: {
    ethicsCodeUrl: 'https://www.pd-promina.hr/dokumenti/eticki-kodeks-pd-promina',
    privacyPolicyUrl: 'https://pd-promina.hr/dokumenti/pravo-na-pristup-informacijama',
    membershipRulesUrl: 'https://pd-promina.hr/dokumenti/poslovnici-i-pravilnici/pravilnik-o-clanstvu'
  }
} as const;
