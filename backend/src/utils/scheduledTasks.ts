// src/utils/scheduledTasks.ts
import membershipService from '../services/membership.service.js';

// Funkcija koja pokreće sve planirane zadatke
export const initScheduledTasks = () => {
  console.log(' Inicijalizacija periodičkih zadataka...');
  
  // Postavi dnevnu provjeru članstava u ponoć
  setInterval(async () => {
    const now = new Date();
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
  
  // Postavi redovito periodičko ažuriranje statusa članstva (svakih 30 minuta)
  setInterval(async () => {
    console.log('Pokretanje periodičkog ažuriranja statusa članstva...');
    try {
      await membershipService.updateAllMembershipStatuses();
      console.log('Periodičko ažuriranje statusa članstva završeno.');
    } catch (error) {
      console.error('Greška prilikom periodičkog ažuriranja statusa članstva:', error);
    }
  }, 30 * 60 * 1000); // 30 minuta
  
  // Odmah pokreni prvo ažuriranje statusa članstva pri pokretanju servera
  setTimeout(async () => {
    console.log('Inicijalno ažuriranje statusa članstva...');
    try {
      await membershipService.updateAllMembershipStatuses();
      console.log('Inicijalno ažuriranje statusa članstva završeno.');
    } catch (error) {
      console.error('Greška prilikom inicijalnog ažuriranja statusa članstva:', error);
    }
  }, 5000); // Pričekaj 5 sekundi nakon pokretanja servera
  
  console.log(' Periodički zadaci uspješno inicijalizirani');
};