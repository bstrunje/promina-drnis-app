import prisma from '../utils/prisma.js';
import bcrypt from 'bcrypt';

export async function checkPasswordUpdateQueue(): Promise<void> {
  try {
    // Get all unprocessed queue entries using Prisma ORM
    const queueEntries = await prisma.password_update_queue.findMany({
      where: { processed: false },
      include: {
        members: {
          select: {
            member_id: true,
            first_name: true,
            last_name: true
          }
        }
      },
      orderBy: { created_at: 'asc' },
      take: 10
    });

    for (const item of queueEntries) {
      try {
        // Generate the password using the same format as in the app
        const password = `${item.members.first_name} ${item.members.last_name}-isk-${item.card_number}`;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Update the user's password using Prisma
        await prisma.member.update({
          where: { member_id: item.member_id },
          data: { password_hash: hashedPassword }
        });
        
        // Mark as processed using Prisma ORM
        await prisma.password_update_queue.update({
          where: { queue_id: item.queue_id },
          data: { processed: true }
        });
        
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
