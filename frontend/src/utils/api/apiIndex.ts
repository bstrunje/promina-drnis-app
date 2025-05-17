// Izvoz svih API funkcija iz pojedinačnih modula

// Izvoz konfiguracije
export { default as api } from './apiConfig';

// Izvoz pomoćnih funkcija
export * from './apiUtils';

// Izvoz tipova
export * from './apiTypes';

// Izvoz funkcija iz pojedinačnih modula
export * from './apiAuth';
export * from './apiMembers';
export * from './apiMembership';
export * from './apiMessages';
export * from './apiStamps';
export * from './apiCards';
export * from './apiMisc';

// Grupiranje svih funkcija u objekt za kompatibilnost sa starim kodom
import * as auth from './apiAuth';
import * as members from './apiMembers';
import * as membership from './apiMembership';
import * as messages from './apiMessages';
import * as stamps from './apiStamps';
import * as cards from './apiCards';
import * as misc from './apiMisc';

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
