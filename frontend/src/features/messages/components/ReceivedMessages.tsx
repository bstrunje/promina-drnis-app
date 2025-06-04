import { useState, useEffect, useCallback } from 'react';
import { 
  getAdminMessages, 
  markMessageAsRead, 
  archiveMessage, 
  deleteMessage, 
  deleteAllMessages 
} from '../../../utils/api/apiMessages';
import { useToast } from "@components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { 
  CheckCircle, 
  Archive, 
  Trash2, 
  Bell
} from "lucide-react";
import { formatDate } from "../../../utils/dateUtils";
import { Message } from '../types/messageTypes';
import { convertApiMessagesToMessages } from '../utils/messageConverters';

interface ReceivedMessagesProps {
  userRole: string;
  onUnreadCountChange: (count: number) => void;
}

export default function ReceivedMessages({ userRole, onUnreadCountChange }: ReceivedMessagesProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'unread' | 'read' | 'archived'>('unread');

  // Učitaj poruke pri prvom renderiranju
  // Zamotaj fetchMessages u useCallback
const fetchMessages = useCallback(async () => {
  // Ako je običan član, preskačemo API poziv za admin poruke
  if (userRole === 'member') {
    setLoading(false);
    return;
  }
  try {
    // Koristi forceLoad=true jer je korisnik aktivno na dijelu aplikacije gdje se prikazuju poruke
    const apiData = await getAdminMessages(true);
    const convertedData = convertApiMessagesToMessages(apiData);
    setMessages(convertedData);
    setLoading(false);
    const unreadCount = convertedData.filter(m => m.status === 'unread').length;
    onUnreadCountChange(unreadCount);
  } catch (error) {
    toast({
      title: "Greška",
      description: error instanceof Error ? error.message : 'Nije moguće dohvatiti poruke',
      variant: "destructive"
    });
    setLoading(false);
  }
}, [userRole, toast, onUnreadCountChange]);

useEffect(() => {
    void fetchMessages();
  }, [userRole, fetchMessages]);

  // Funkcija za označavanje poruke kao pročitane
  const onMarkAsRead = async (messageId: number) => {
    try {
      await markMessageAsRead(messageId);
      
      // Ažuriraj lokalno stanje
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.message_id === messageId 
            ? { ...msg, status: 'read' } 
            : msg
        )
      );
      
      // Ažuriraj brojač nepročitanih poruka
      const updatedUnreadCount = messages.filter(m => m.status === 'unread' && m.message_id !== messageId).length;
      onUnreadCountChange(updatedUnreadCount);
      
      toast({
        title: "Uspjeh",
        description: "Poruka je označena kao pročitana",
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : 'Nije moguće označiti poruku kao pročitanu',
        variant: "destructive"
      });
    }
  };

  // Funkcija za arhiviranje poruke
  const onArchive = async (messageId: number) => {
    try {
      await archiveMessage(messageId);
      
      // Ažuriraj lokalno stanje
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.message_id === messageId 
            ? { ...msg, status: 'archived' } 
            : msg
        )
      );
      
      // Ako je poruka bila nepročitana, ažuriraj brojač
      const archivedMessage = messages.find(m => m.message_id === messageId);
      if (archivedMessage && archivedMessage.status === 'unread') {
        const updatedUnreadCount = messages.filter(m => m.status === 'unread' && m.message_id !== messageId).length;
        onUnreadCountChange(updatedUnreadCount);
      }
      
      toast({
        title: "Uspjeh",
        description: "Poruka je arhivirana",
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : 'Nije moguće arhivirati poruku',
        variant: "destructive"
      });
    }
  };

  // Funkcija za brisanje poruke
  const onDelete = async (messageId: number) => {
    if (!window.confirm('Jeste li sigurni da želite obrisati ovu poruku?')) {
      return;
    }
    
    try {
      await deleteMessage(messageId);
      
      // Ako je poruka bila nepročitana, ažuriraj brojač
      const deletedMessage = messages.find(m => m.message_id === messageId);
      if (deletedMessage && deletedMessage.status === 'unread') {
        const updatedUnreadCount = messages.filter(m => m.status === 'unread' && m.message_id !== messageId).length;
        onUnreadCountChange(updatedUnreadCount);
      }
      
      // Ažuriraj lokalno stanje
      setMessages(prevMessages => 
        prevMessages.filter(msg => msg.message_id !== messageId)
      );
      
      toast({
        title: "Uspjeh",
        description: "Poruka je obrisana",
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : 'Nije moguće obrisati poruku',
        variant: "destructive"
      });
    }
  };

  // Funkcija za brisanje svih poruka
  const onDeleteAll = async () => {
    if (!window.confirm('Jeste li sigurni da želite obrisati sve poruke?')) {
      return;
    }
    
    try {
      await deleteAllMessages();
      
      // Ažuriraj lokalno stanje
      setMessages([]);
      
      // Resetiraj brojač nepročitanih poruka
      onUnreadCountChange(0);
      
      toast({
        title: "Uspjeh",
        description: "Sve poruke su obrisane",
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : 'Nije moguće obrisati sve poruke',
        variant: "destructive"
      });
    }
  };

  // Filtriraj poruke prema odabranom filteru
  const filteredMessages = messages.filter(message => message.status === filter);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          <Button
            variant={filter === 'unread' ? 'default' : 'outline'}
            onClick={() => setFilter('unread')}
            className="flex items-center space-x-2"
          >
            <Bell className="h-4 w-4 mr-1" />
            <span>Nepročitane</span>
          </Button>
          <Button
            variant={filter === 'read' ? 'default' : 'outline'}
            onClick={() => setFilter('read')}
            className="flex items-center space-x-2"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            <span>Pročitane</span>
          </Button>
          <Button
            variant={filter === 'archived' ? 'default' : 'outline'}
            onClick={() => setFilter('archived')}
            className="flex items-center space-x-2"
          >
            <Archive className="h-4 w-4 mr-1" />
            <span>Arhivirane</span>
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredMessages.length > 0 ? (
          <>
            {userRole === 'member_superuser' && (
              <div className="flex justify-end mb-4">
                <Button
                  variant="destructive"
                  onClick={() => { void onDeleteAll(); }}
                  className="flex items-center space-x-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Izbriši sve poruke</span>
                  <span className="sm:hidden">Izbriši sve</span>
                </Button>
              </div>
            )}

            {filteredMessages.map((message) => (
              <Card key={message.message_id} className={message.status === 'unread' ? 'border-blue-500' : ''}>
                <CardHeader>
                  <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <span>{message.sender_name}</span>
                    <div className="flex flex-wrap gap-2">
                      {message.status === 'unread' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => { void onMarkAsRead(message.message_id); }}
                          className="flex items-center"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">Označi kao pročitano</span>
                          <span className="sm:hidden">Pročitano</span>
                        </Button>
                      )}
                      {/* Duplicirani gumb za "Označi kao pročitano" - ostavljeno ako je namjerno za drugačiji uvjet prikaza */}
                      {message.status !== 'archived' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => { void onMarkAsRead(message.message_id); }}
                          className="flex items-center"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">Označi kao pročitano</span>
                          <span className="sm:hidden">Pročitano</span>
                        </Button>
                      )}
                      {message.status !== 'archived' && (
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => { void onArchive(message.message_id); }}
                          title="Arhiviraj poruku"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                      {userRole === 'member_superuser' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { void onDelete(message.message_id); }}
                          className="text-red-500 hover:text-red-700"
                          title="Obriši poruku"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div> {/* Zatvaranje diva s gumbima */} 
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-2 text-gray-500 text-sm">
                    {formatDate(message.created_at)}
                  </div>
                  <p className="whitespace-pre-wrap">{message.message_text}</p>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <div className="text-center p-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">
              {loading 
                ? "Učitavanje poruka..." 
                : `Nema ${filter === 'unread' ? 'nepročitanih' : filter === 'read' ? 'pročitanih' : 'arhiviranih'} poruka`}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4">
        <Button
          variant="outline"
          onClick={() => { void fetchMessages(); }}
          className="w-full"
        >
          Osvježi poruke
        </Button>
      </div>
    </div>
  );
}
