// config/auth.config.ts
// Konfiguracija sigurnosnih postavki za autentifikaciju

/**
 * Maksimalni broj dopuštenih neuspjelih pokušaja prijave prije privremenog blokiranja korisnika.
 * Nakon ovog broja neuspjelih pokušaja, korisnički račun će biti privremeno blokiran.
 */
export const MAX_FAILED_LOGIN_ATTEMPTS = 5;

/**
 * Trajanje blokiranja računa u minutama nakon prekoračenja dopuštenog broja neuspjelih pokušaja prijave.
 */
export const ACCOUNT_LOCKOUT_DURATION_MINUTES = 30;

/**
 * Period resetiranja brojača neuspjelih pokušaja u minutama.
 * Ako korisnik ne pokuša prijavu unutar ovog perioda, brojač neuspjelih pokušaja se resetira.
 */
export const FAILED_ATTEMPTS_RESET_MINUTES = 120; // 2 sata

/**
 * Vrijeme odgode za odgovor pri neuspjeloj prijavi (u milisekundama).
 * Služi kao zaštita od timing napada.
 */
export const LOGIN_DELAY_MS = 500;

/**
 * Postavka koja određuje hoće li se automatsko blokiranje primjenjivati i na administratore.
 * Postavljeno na false kako bi se spriječilo slučajno zaključavanje administratorskih računa.
 */
export const LOCKOUT_ADMINS = false;
