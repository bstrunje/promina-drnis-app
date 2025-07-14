import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en/translation.json';
import translationHR from './locales/hr/translation.json';

// Definicija resursa za prijevode
const resources = {
  en: {
    translation: translationEN
  },
  hr: {
    translation: translationHR
  }
};

i18n
  .use(LanguageDetector) // Detektira jezik korisnikovog preglednika
  .use(initReactI18next) // Povezuje i18next s Reactom
  .init({
    resources,
    fallbackLng: 'hr', // Koristi hrvatski ako detektirani jezik nije dostupan
    debug: process.env.NODE_ENV === 'development', // Uključuje logiranje u konzolu samo u razvoju
    interpolation: {
      escapeValue: false // React sam po sebi štiti od XSS napada
    }
  });

export default i18n;
