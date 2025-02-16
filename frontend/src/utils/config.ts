export const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://promina-drnis-api.vercel.app/api'
  : 'http://localhost:3000/api';