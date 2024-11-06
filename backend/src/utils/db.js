// src/utils/db.js

import pkg from 'pg';
const { Pool } = pkg;

console.log('DATABASE_URL:', process.env.DATABASE_URL);

const pool = new Pool({
  user: process.env.DB_USER || 'bozos',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'promina_drnis_DB',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
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
   * @returns {Promise<QueryResult>} The query result
   */
  query: async (text, params) => {
    const start = Date.now();
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log({
        query: text,
        params,
        duration,
        rows: result.rowCount
      });
      return result;
    } catch (error) {
      console.error('Database query error:', {
        query: text,
        params,
        error: error.message
      });
      throw error;
    }
  },

  // ... [rest of the code remains unchanged]

};

export default db;