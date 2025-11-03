// Validacija email adrese (očekuje string)
export function validateEmail(email: string) {
    // Jednostavna i široko korištena provjera formata e-pošte
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}