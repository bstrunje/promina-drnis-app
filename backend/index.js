// Vercel serverless entry point - koristi postojeći backend server
import app from './dist/server.js';

// Vercel serverless handler - koristi postojeći Express server
export default app;
