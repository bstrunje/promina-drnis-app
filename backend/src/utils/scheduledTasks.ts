// src/utils/scheduledTasks.ts
import membershipService from '../services/membership.service.js';
import { getCurrentDate } from '../utils/dateUtils.js';
import prisma from '../utils/prisma.js';

// Funkcija za provjeru nepročitanih poruka
async function checkUnreadMessages() {
  try {
    // Dohvati sve članove koji imaju nepročitane poruke
    const membersWithUnreadMessages = await prisma.messageRecipientStatus.groupBy({
      by: ['recipient_member_id'],
      where: {
        status: 'unread'
      },
      _count: {
        message_id: true
      }
    });
    
    // Dohvati ukupan broj nepročitanih poruka
    const totalUnread = membersWithUnreadMessages.reduce((sum, member) => sum + member._count.message_id, 0);
    
    // Ispiši informacije o nepročitanim porukama
    console.log('\n📧 Status nepročitanih poruka:');
    
    if (membersWithUnreadMessages.length > 0) {
      console.log(`   🔴 Ukupno ${totalUnread} nepročitanih poruka za ${membersWithUnreadMessages.length} članova`);
      for (const memberData of membersWithUnreadMessages) {
        // Dohvati ime člana ako je moguće
        let memberName = '';
        try {
          const member = await prisma.member.findUnique({
            where: { member_id: memberData.recipient_member_id },
            select: { first_name: true, last_name: true }
          });
          if (member) {
            memberName = `${member.first_name} ${member.last_name}`;
          }
        } catch (e) {
          // Ignoriraj grešku ako ne možemo dohvatiti ime člana
        }
        
        console.log(`   • Član ID ${memberData.recipient_member_id}${memberName ? ` (${memberName})` : ''}: ${memberData._count.message_id} nepročitanih poruka`);
      }
    } else {
      console.log('   ✅ Nema nepročitanih poruka');
    }
  } catch (error) {
    console.error('❌ Greška prilikom provjere nepročitanih poruka:', error);
  }
}

// Funkcija koja pokreće sve planirane zadatke
export const initScheduledTasks = () => {
  // Koristimo setTimeout kako bismo osigurali da se logovi pravilno prikazuju nakon inicijalizacije servera
  setTimeout(() => {
    console.log('\n🕐 Inicijalizacija periodičkih zadataka...');
  
  // Periodična provjera nepročitanih poruka (svakih 60 sekundi)
  console.log('   ✔️ Postavljam periodičnu provjeru nepročitanih poruka (svakih 60 sekundi)');
  
  // Odmah izvrši prvu provjeru
  checkUnreadMessages();
  
  // Postavi interval za periodično izvršavanje
  setInterval(checkUnreadMessages, 60000); // Provjera svakih 60 sekundi
  
  // Postavi dnevnu provjeru članstava u ponoć
  console.log('   ✔️ Postavljam dnevnu provjeru članstava u ponoć');
  setInterval(async () => {
    const now = getCurrentDate();
    // Provjeri je li ponoć (00:00:00)
    if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
      console.log('Pokretanje planirane provjere članstava...');
      try {
        await membershipService.checkAutoTerminations();
      } catch (error) {
        console.error('Greška prilikom planirane provjere članstava:', error);
      }
    }
  }, 1000); // Provjera svake sekunde
  
  // U produkcijskom okruženju možemo imati problema s pristupom Prismi
  // Kako bismo izbjegli probleme s deploymentom, provjeravamo okruženje
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!isProduction) {
    // Uklonjeno automatsko ažuriranje statusa članstva!
    // Ako želiš ručno pokretanje, koristi npr. API endpoint ili CLI.
  } else {
    console.log(' Periodički zadaci za ažuriranje statusa članstva preskočeni u produkcijskom okruženju');
  }
  
  console.log(' Periodički zadaci uspješno inicijalizirani');
  }, 500); // Malo odgodimo inicijalizaciju kako bi se logovi pravilno prikazali
};