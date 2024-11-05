// src/utils/db.js

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Log when pool establishes connection
pool.on('connect', () => {
  console.log('Database pool connected');
});

// Log any pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Helper functions
const db = {
  /**
   * Execute a SQL query
   * @param {string} text - The SQL query text
   * @param {Array} params - The query parameters
   */
  query: (text, params) => pool.query(text, params),

  /**
   * Get a client from the pool
   * Useful for transactions
   */
  getClient: () => pool.connect(),

  /**
   * Close the pool
   * Should be called when shutting down the app
   */
  close: () => pool.end()
};

export default db;