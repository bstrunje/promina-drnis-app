export const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://backend-773xdblgd-bozo-strunjes-projects.vercel.app/api'  // Najnoviji uspješni deployment
  : 'http://localhost:3000/api';