import db from '../utils/db.js';
import bcrypt from 'bcrypt';

export async function checkPasswordUpdateQueue(): Promise<void> {
  try {
    // Get all unprocessed queue entries
    const queueResult = await db.query(`
      SELECT q.queue_id, q.member_id, q.card_number, m.first_name, m.last_name
      FROM password_update_queue q
      JOIN members m ON q.member_id = m.member_id
      WHERE q.processed = false
      ORDER BY q.created_at ASC
      LIMIT 10 -- Process in batches
    `);

    for (const item of queueResult.rows) {
      try {
        // Generate the password using the same format as in the app
        const password = `${item.first_name} ${item.last_name}-isk-${item.card_number}`;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Update the user's password
        await db.query(`
          UPDATE members 
          SET password_hash = $1
          WHERE member_id = $2
        `, [hashedPassword, item.member_id]);
        
        // Mark as processed
        await db.query(`
          UPDATE password_update_queue
          SET processed = true
          WHERE queue_id = $1
        `, [item.queue_id]);
        
        console.log(`Updated password for member ${item.member_id} based on new card number`);
      } catch (itemError) {
        console.error(`Error processing queue item ${item.queue_id}:`, itemError);
      }
    }
  } catch (error) {
    console.error('Error in password update job:', error);
  }
}

// Run this job every minute
export function startPasswordUpdateJob() {
  setInterval(checkPasswordUpdateQueue, 60000);
  console.log('Password update job started');
}
