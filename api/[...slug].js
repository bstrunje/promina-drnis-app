// Vercel serverless function that handles all API routes
// This catches all /api/* routes and forwards them to the Express app

let app;

module.exports = async (req, res) => {
  if (!app) {
    // Dynamic import za ES Module
    const appModule = await import('../backend/dist/app.js');
    app = appModule.default;
  }
  
  return app(req, res);
};
