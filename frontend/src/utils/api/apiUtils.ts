import axios, { AxiosError } from 'axios';

// Definiramo tip za odgovor servera
interface ApiErrorResponse {
  message?: string;
  error?: string;
  statusCode?: number;
}

/**
 * Centralizirana funkcija za rukovanje API greškama
 * @param error Greška koja se dogodila
 * @param defaultMessage Zadana poruka ako nema specifične poruke greške
 * @returns never - uvijek baca grešku tipa Error
 * @throws {Error} Uvijek baca Error objekt s odgovarajućom porukom
 */
export const handleApiError = (error: unknown, defaultMessage: string): never => {
  console.error("API Error:", error);
  
  // Ako je error već Error objekt, bacamo ga direktno
  if (error instanceof Error) {
    throw error;
  }
  
  if (axios.isAxiosError(error)) {
    // Sigurno pretvaranje u AxiosError tip
    const axiosError = error as AxiosError<ApiErrorResponse>;
    
    // Detaljnije logiranje odgovora servera za debugging
    console.log("Server response:", axiosError.response?.data);
    
    // Izdvajamo poruku iz odgovora servera, ako postoji
    const serverMessage = axiosError.response?.data?.message;
    
    if (typeof serverMessage === 'string' && serverMessage.length > 0) {
      // Poboljšane poruke za krajnje korisnike
      if (serverMessage === "Member with this OIB already exists") {
        throw new Error("Član s ovim OIB-om već postoji. Molimo koristite drugi OIB ili kontaktirajte administratora.");
      }
      throw new Error(serverMessage);
    } else {
      throw new Error(defaultMessage);
    }
  }
  
  // Za sve ostale slučajeve, bacamo generalni Error
  throw new Error(defaultMessage);
};
