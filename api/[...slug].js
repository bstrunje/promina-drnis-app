// Vercel serverless function that handles all API routes
// This catches all /api/* routes and forwards them to the Express app

import app from '../backend/dist/app.js';

export default app;
