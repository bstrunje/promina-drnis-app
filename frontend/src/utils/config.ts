export const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://backend-5snfbm28t-bozo-strunjes-projects.vercel.app/api'  // Novi backend URL
  : 'http://localhost:3000/api';