// src/utils/scheduledTasks.ts
import membershipService from '../services/membership.service.js';
import memberStatusSyncService from '../services/memberStatusSync.service.js';
import { getCurrentDate } from '../utils/dateUtils.js';
import prisma from '../utils/prisma.js';

// Funkcija za provjeru nepročitanih poruka
async function checkUnreadMessages() {
  try {
    // Dohvati sve nepročitane statuse s detaljima o poruci i pošiljatelju
    const statuses = await prisma.messageRecipientStatus.findMany({
      where: { status: 'unread' },
      select: {
        recipient_member_id: true,
        message: { select: { sender_id: true } }
      }
    });

    // Filtriraj statuse gdje član NIJE pošiljatelj
    const filtered = statuses.filter(
      s => s.recipient_member_id !== s.message?.sender_id
    );

    // Grupiraj po recipient_member_id i izračunaj broj
    const memberUnreadMap: Record<number, number> = {};
    for (const s of filtered) {
      memberUnreadMap[s.recipient_member_id] = (memberUnreadMap[s.recipient_member_id] || 0) + 1;
    }
    const membersWithUnreadMessages = Object.entries(memberUnreadMap).map(
      ([recipient_member_id, count]) => ({
        recipient_member_id: Number(recipient_member_id),
        count
      })
    );
    const totalUnread = filtered.length;

    
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
        
        console.log(`   • Član ID ${memberData.recipient_member_id}${memberName ? ` (${memberName})` : ''}: ${memberData.count} nepročitanih poruka`);
      }
    } else {
      console.log('   ✅ Nema nepročitanih poruka');
    }
  } catch (error) {
    console.error('❌ Greška prilikom provjere nepročitanih poruka:', error);
  }
}

// Funkcija za sinkronizaciju neaktivnih članova
async function runInactiveMemberSync() {
  console.log('\n🔄 Pokretanje sinkronizacije neaktivnih članova...');
  try {
    const result = await memberStatusSyncService.syncInactiveMembers();
    if (result.updatedCount > 0) {
      console.log(`   ✅ Uspješno sinkronizirano. Ažurirano članova: ${result.updatedCount}`);
    } else {
      console.log('   ✅ Nema članova za ažuriranje.');
    }
  } catch (error) {
    console.error('❌ Greška prilikom sinkronizacije neaktivnih članova:', error);
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

  // Periodična sinkronizacija neaktivnih članova (svakih sat vremena)
  console.log('   ✔️ Postavljam periodičnu sinkronizaciju neaktivnih članova (svakih sat vremena)');
  runInactiveMemberSync(); // Odmah izvrši prvu sinkronizaciju
  setInterval(runInactiveMemberSync, 3600000); // Svakih 3600000 ms = 1 sat
  
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