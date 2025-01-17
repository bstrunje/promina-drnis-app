export const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://backend-bozo-strunjes-projects.vercel.app/api'  // Ažurirano prema vercel project ls
  : 'http://localhost:3000/api';