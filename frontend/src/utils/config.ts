// frontend/src/utils/config.ts
// Ensure this points to your Render backend
export const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://promina-drnis-api.onrender.com/api'
  : 'http://localhost:3000/api'; // Restore original development URL

export const IMAGE_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://promina-drnis-api.onrender.com/uploads'
  : 'http://localhost:3000/uploads'; // Use full URL for local too