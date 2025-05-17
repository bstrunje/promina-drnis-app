// Izvoz svih API funkcija iz pojedinačnih modula

// Izvoz konfiguracije
export { default as api } from './config';

// Izvoz pomoćnih funkcija
export * from './utils';

// Izvoz tipova
export * from './types';

// Izvoz funkcija iz pojedinačnih modula
export * from './auth';
export * from './members';
export * from './membership';
export * from './messages';
export * from './stamps';
export * from './cards';
export * from './misc';

// Grupiranje svih funkcija u objekt za kompatibilnost sa starim kodom
import * as auth from './auth';
import * as members from './members';
import * as membership from './membership';
import * as messages from './messages';
import * as stamps from './stamps';
import * as cards from './cards';
import * as misc from './misc';

// Objekt koji sadrži sve API funkcije
const api = {
  ...auth,
  ...members,
  ...membership,
  ...messages,
  ...stamps,
  ...cards,
  ...misc
};

export default api;
