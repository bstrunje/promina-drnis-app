// src/utils/scheduledTasks.ts
import membershipService from '../services/membership.service.js';
import { getCurrentDate } from '../utils/dateUtils.js';

// Funkcija koja pokreće sve planirane zadatke
export const initScheduledTasks = () => {
  console.log(' Inicijalizacija periodičkih zadataka...');
  
  // Postavi dnevnu provjeru članstava u ponoć
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
};