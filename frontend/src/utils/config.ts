export const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD 
    ? 'https://promina-drnis-backend.herokuapp.com/api'
    : 'http://localhost:3000/api');