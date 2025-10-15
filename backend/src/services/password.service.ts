import crypto from 'node:crypto';

// Definicija tipa za strategije kako bismo imali autocompletion i provjeru tipova
type PasswordGenerationStrategy = 'FULLNAME_ISK_CARD' | 'RANDOM_8' | 'EMAIL_PREFIX_CARD_SUFFIX';

// Minimalni tip koji sadrži samo potrebna polja za generiranje lozinke
interface MemberPasswordData {
  full_name?: string | null;
  email?: string | null;
}

// Tip za dodatne parametre generiranja lozinke
interface PasswordGenerationOptions {
  separator?: string | null;      // Separator za FULLNAME_ISK_CARD strategiju (npr. "-isk-")
  cardDigits?: number | null;     // Broj zadnjih znamenki kartice za EMAIL_PREFIX_CARD_SUFFIX strategiju
}

/**
 * Generira nasumični string specificirane duljine.
 * @param length Duljina stringa.
 * @returns Nasumični string.
 */
const generateRandomString = (length: number): string => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex') // pretvori u heksadecimalni string
    .slice(0, length); // odreži na željenu duljinu
};

/**
 * Generira lozinku na temelju odabrane strategije.
 * @param strategy Odabrana strategija ('FULLNAME_ISK_CARD', 'RANDOM_8', 'EMAIL_PREFIX_CARD_SUFFIX').
 * @param member Objekt člana za kojeg se generira lozinka.
 * @param cardNumber Broj iskaznice člana.
 * @param options Dodatni parametri (separator, cardDigits).
 * @returns Generirana lozinka.
 */
const generatePassword = (
  strategy: PasswordGenerationStrategy | null | undefined,
  member: MemberPasswordData,
  cardNumber: string,
  options?: PasswordGenerationOptions
): string => {
  // Osiguravamo da imamo fallback vrijednost ako je full_name null ili undefined
  const fullName = member.full_name ?? 'user';
  
  // Dohvati separator i broj znamenki iz opcija ili koristi defaultne vrijednosti
  const separator = options?.separator ?? '-isk-';
  const cardDigits = options?.cardDigits ?? 4;

  switch (strategy) {
    case 'RANDOM_8':
      return generateRandomString(8);

    case 'EMAIL_PREFIX_CARD_SUFFIX':
      if (member.email) {
        const emailPrefix = member.email.split('@')[0];
        // Koristi prilagođen broj zadnjih znamenki kartice
        const cardSuffix = cardNumber.slice(-cardDigits);
        // Osigurava da lozinka nije prekratka
        if (emailPrefix && cardSuffix) {
          return `${emailPrefix}${cardSuffix}`;
        }
      }
      // Fallback ako email ne postoji ili je neispravan
      return `${fullName}${separator}${cardNumber}`;

    case 'FULLNAME_ISK_CARD':
    default:
      // Koristi prilagođen separator
      return `${fullName}${separator}${cardNumber}`;
  }
};

const passwordService = {
  generatePassword,
};

export default passwordService;
