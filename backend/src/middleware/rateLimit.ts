import rateLimit, { Options as RateLimitOptions } from 'express-rate-limit';

/**
 * Kreira middleware za ograničavanje broja zahtjeva
 * @param options Opcije za konfiguraciju rate limitinga
 * @returns Middleware funkcija za rate limiting
 */
export const createRateLimit = (options?: Partial<RateLimitOptions>) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuta
    max: 100, // ograniči svaku IP adresu na 100 zahtjeva po windowMs
    standardHeaders: true, // Vraća standardne X-RateLimit-* zaglavlja
    legacyHeaders: false, // Onemogući X-RateLimit-* zaglavlja
    ...options
  });
};

/**
 * Kreira middleware za ograničavanje broja zahtjeva za osvježavanje tokena
 * Stroža ograničenja za refresh token zahtjeve radi sprječavanja zlouporabe
 * @returns Middleware funkcija za rate limiting refresh token zahtjeva
 */
export const createRefreshTokenRateLimit = () => {
  return rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minuta
    max: 10, // ograniči svaku IP adresu na 10 zahtjeva za osvježavanje tokena u 5 minuta
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Previše pokušaja osvježavanja tokena. Molimo pokušajte ponovno kasnije.' },
    skipSuccessfulRequests: true, // Ne računa uspješne zahtjeve u ograničenje
    keyGenerator: (req) => {
      // Koristi kombinaciju IP adrese i member_id ako je dostupan u decodiranom tokenu
      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      
      // Pokušaj dohvatiti member_id iz kolačića
      let memberId = 'unknown';
      try {
        if (req.cookies && req.cookies.refreshToken) {
          const refreshToken = req.cookies.refreshToken;
          // Dohvati samo payload bez verifikacije potpisa
          const tokenParts = refreshToken.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            if (payload && payload.id) {
              memberId = payload.id.toString();
            }
          }
        }
      } catch (_error) {
        // Ignoriramo greške pri parsiranju tokena
      }
      
      return `${ip}:${memberId}`;
    }
  });
};