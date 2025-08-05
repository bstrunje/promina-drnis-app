import prisma from '../utils/prisma.js';
import bcrypt from 'bcrypt';

export async function checkPasswordUpdateQueue(): Promise<void> {
  try {
    // Get all unprocessed queue entries using Prisma raw SQL
    const queueResult = await prisma.$queryRaw<Array<{
      queue_id: number;
      member_id: number;
      card_number: string;
      first_name: string;
      last_name: string;
    }>>`
      SELECT q.queue_id, q.member_id, q.card_number, m.first_name, m.last_name
      FROM password_update_queue q
      JOIN members m ON q.member_id = m.member_id
      WHERE q.processed = false
      ORDER BY q.created_at ASC
      LIMIT 10
    `;

    for (const item of queueResult) {
      try {
        // Generate the password using the same format as in the app
        const password = `${item.first_name} ${item.last_name}-isk-${item.card_number}`;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Update the user's password using Prisma
        await prisma.member.update({
          where: { member_id: item.member_id },
          data: { password_hash: hashedPassword }
        });
        
        // Mark as processed using Prisma raw SQL
        await prisma.$executeRaw`
          UPDATE password_update_queue
          SET processed = true
          WHERE queue_id = ${item.queue_id}
        `;
        
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
