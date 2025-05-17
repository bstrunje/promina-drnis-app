// Refaktorirani MessageList.tsx - koristi komponente iz /components direktorija
import MessageListMain from './MessageList';

// Zadržavamo istu strukturu eksporta za kompatibilnost
export default function MessageList() {
  return <MessageListMain />;
}
