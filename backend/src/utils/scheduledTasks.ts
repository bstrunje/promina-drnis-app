// src/utils/scheduledTasks.ts
import membershipService from '../services/membership.service.js';

// Funkcija koja pokreće sve planirane zadatke
export const initScheduledTasks = () => {
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
};