export const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://backend-sandy-pi-26.vercel.app/api'
  : 'http://localhost:3000/api';