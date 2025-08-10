// src/utils/scheduledTasks.ts
import membershipService from '../services/membership.service.js';
import { getCurrentDate } from '../utils/dateUtils.js';
import prisma from '../utils/prisma.js';

const isDev = process.env.NODE_ENV === 'development';

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

    
    // Ispiši informacije o nepročitanim porukama (samo u developmentu)
    if (isDev) console.log('\n📧 Status nepročitanih poruka:');
    
    if (membersWithUnreadMessages.length > 0) {
      if (isDev) console.log(`   🔴 Ukupno ${totalUnread} nepročitanih poruka za ${membersWithUnreadMessages.length} članova`);
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
        } catch {
          // Ignoriraj grešku ako ne možemo dohvatiti ime člana
        }
        
        if (isDev) console.log(`   • Član ID ${memberData.recipient_member_id}${memberName ? ` (${memberName})` : ''}: ${memberData.count} nepročitanih poruka`);
      }
    } else {
      if (isDev) console.log('   ✅ Nema nepročitanih poruka');
    }
  } catch (error) {
    console.error('❌ Greška prilikom provjere nepročitanih poruka:', error);
  }
}

// Funkcija za sinkronizaciju neaktivnih članova je uklonjena jer servis ne postoji

// Funkcija koja pokreće sve planirane zadatke
export const initScheduledTasks = () => {
  // Koristimo setTimeout kako bismo osigurali da se logovi pravilno prikazuju nakon inicijalizacije servera
  setTimeout(() => {
    if (isDev) console.log('\n🕐 Inicijalizacija periodičkih zadataka...');
  
  // Periodična provjera nepročitanih poruka (svakih 60 sekundi)
  if (isDev) console.log('   ✔️ Postavljam periodičnu provjeru nepročitanih poruka (svakih 60 sekundi)');
  
  // Odmah izvrši prvu provjeru
  checkUnreadMessages();
  
  // Postavi interval za periodično izvršavanje
  setInterval(checkUnreadMessages, 60000); // Provjera svakih 60 sekundi

  // Periodična sinkronizacija neaktivnih članova je uklonjena jer servis ne postoji
  if (isDev) console.log('   ⚠️ Sinkronizacija neaktivnih članova preskočena (servis ne postoji)');
  
  // Postavi dnevnu provjeru članstava u ponoć
  if (isDev) console.log('   ✔️ Postavljam dnevnu provjeru članstava u ponoć');
  setInterval(async () => {
    const now = getCurrentDate();
    // Provjeri je li ponoć (00:00:00)
    if (now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() === 0) {
      if (isDev) console.log('Pokretanje planirane provjere članstava...');
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
    if (isDev) console.log(' Periodički zadaci za ažuriranje statusa članstva preskočeni u produkcijskom okruženju');
  }
  
  if (isDev) console.log(' Periodički zadaci uspješno inicijalizirani');
  }, 500); // Malo odgodimo inicijalizaciju kako bi se logovi pravilno prikazali
};