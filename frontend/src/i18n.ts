import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';


// Import all namespace files for English
import commonEN from './locales/en/common.json';
import authEN from './locales/en/auth.json';
import messagesEN from './locales/en/messages.json';
import activitiesEN from './locales/en/activities.json';
import profileEN from './locales/en/profile.json';
import dashboardsEN from './locales/en/dashboards.json';
import membersEN from './locales/en/members.json';
import settingsEN from './locales/en/settings.json';
import dutyEN from './locales/en/duty.json';

// Import all namespace files for Croatian
import commonHR from './locales/hr/common.json';
import authHR from './locales/hr/auth.json';
import messagesHR from './locales/hr/messages.json';
import activitiesHR from './locales/hr/activities.json';
import profileHR from './locales/hr/profile.json';
import dashboardsHR from './locales/hr/dashboards.json';
import membersHR from './locales/hr/members.json';
import settingsHR from './locales/hr/settings.json';
import dutyHR from './locales/hr/duty.json';

// Definicija resursa za prijevode sa višestrukim namespace-ima
const resources = {
  en: {
    common: commonEN,
    auth: authEN,
    messages: messagesEN,
    activities: activitiesEN,
    profile: profileEN,
    dashboards: dashboardsEN,
    members: membersEN,
    settings: settingsEN,
    duty: dutyEN
  },
  hr: {
    common: commonHR,
    auth: authHR,
    messages: messagesHR,
    activities: activitiesHR,
    profile: profileHR,
    dashboards: dashboardsHR,
    members: membersHR,
    settings: settingsHR,
    duty: dutyHR
  }
};

// Ignoriramo promise inicijalizacije jer nije potrebno awaitati u ovom kontekstu
void i18n
  .use(LanguageDetector) // Detektira jezik korisnikovog preglednika
  .use(initReactI18next) // Povezuje i18next s Reactom
  .init({
    resources,
    fallbackLng: 'hr', // Koristi hrvatski ako detektirani jezik nije dostupan
    debug: import.meta.env.DEV, // Uključuje logiranje u konzolu samo u razvoju
    interpolation: {
      escapeValue: false // React sam po sebi štiti od XSS napada
    },
    // Standardna i18next konfiguracija za pluralizaciju
    pluralSeparator: '_',
    contextSeparator: '_',
    // Default namespace
    defaultNS: 'common',
    // Available namespaces
    ns: ['common', 'auth', 'messages', 'activities', 'profile', 'dashboards', 'members', 'settings', 'duty']
  });

export default i18n;
