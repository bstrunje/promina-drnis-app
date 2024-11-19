import bcrypt from 'bcrypt';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function updatePasswords() {
  const client = await pool.connect();
  try {
    const users = await client.query('SELECT username, password FROM users');
    for (let user of users.rows) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await client.query('UPDATE users SET password = $1 WHERE username = $2', [hashedPassword, user.username]);
      console.log(`Updated password for ${user.username}`);
    }
  } finally {
    client.release();
  }
  await pool.end();
}

updatePasswords().catch(console.error);