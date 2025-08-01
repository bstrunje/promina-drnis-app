// Vercel serverless entry point - koristi postojeći Express app iz dist/app.js
import app from './dist/app.js';

// Vercel serverless handler - koristi postojeći Express server s rutama
export default app;
