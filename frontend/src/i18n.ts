import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';


// Import all namespace files for English
import commonEN from './locales/en/common.json';
import authEN from './locales/en/auth.json';
import messagesEN from './locales/en/messages.json';
import activitiesEN from './locales/en/activities.json';

// Import all namespace files for Croatian
import commonHR from './locales/hr/common.json';
import authHR from './locales/hr/auth.json';
import messagesHR from './locales/hr/messages.json';
import activitiesHR from './locales/hr/activities.json';

// Definicija resursa za prijevode sa višestrukim namespace-ima
const resources = {
  en: {
    common: commonEN,
    auth: authEN,
    messages: messagesEN,
    activities: activitiesEN
  },
  hr: {
    common: commonHR,
    auth: authHR,
    messages: messagesHR,
    activities: activitiesHR
  }
};

i18n
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
    ns: ['common', 'auth', 'messages', 'activities']
  });

export default i18n;
