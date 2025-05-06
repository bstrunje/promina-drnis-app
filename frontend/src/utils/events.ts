// Datoteka za definiranje prilagođenih događaja za komunikaciju između komponenti

// Definiramo CustomEvent tip koji odgovara nativnom CustomEvent ali s prilagođenim tipovima
export interface CustomEvent extends Event {
  detail?: any;
}

// Prilagođena funkcija za dispatch događaja s mogućnošću dodavanja podataka
export const dispatchCustomEvent = (eventName: string, detail?: any) => {
  const event = new CustomEvent(eventName, { detail });
  window.dispatchEvent(event);
};

// Konstante za imena događaja - lakše održavanje i izbjegavanje grešaka
export const MESSAGE_EVENTS = {
  UNREAD_UPDATED: 'unreadMessagesUpdated',
  MESSAGE_SENT: 'messageSent',
  MESSAGE_DELETED: 'messageDeleted'
};
