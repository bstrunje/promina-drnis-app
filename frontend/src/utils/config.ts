// frontend/src/utils/config.ts
// Ensure this points to your Render backend
export const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://promina-drnis-api.onrender.com/api'
  : '/api'; // Use relative path for development to leverage Vite proxy

export const IMAGE_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://promina-drnis-api.onrender.com/uploads'
  : '/uploads'; // Use relative path for development to leverage Vite proxy