import app from './src/app.js';
import { setupDatabase } from './src/setupDatabase.js';

// Inicijalizacija baze podataka
setupDatabase()
  .then(() => {
    console.log('✅ Database setup completed');
  })
  .catch((error) => {
    console.error('❌ Database setup failed:', error);
  });

// Vercel koristi serverless funkcije, pa nam ne treba eksplicitno pokretanje servera
export default app;