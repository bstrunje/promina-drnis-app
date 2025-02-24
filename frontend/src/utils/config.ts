// frontend/src/utils/config.ts
export const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://promina-drnis-api.onrender.com/api'
  : 'http://localhost:3000/api';