// frontend/src/utils/config.ts
// Koristimo relativne putanje za API i slike.
// Ovo radi i za lokalni razvoj (uz Vite proxy) i za produkciju na Vercelu,
// gdje frontend i backend dijele istu domenu.
export const API_BASE_URL = '/api';
export const IMAGE_BASE_URL = '/uploads';