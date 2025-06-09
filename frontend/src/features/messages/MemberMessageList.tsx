import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { useToast } from "@components/ui/use-toast";
import { Bell, CheckCircle, MessageCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
// Zamijenjeno prema novoj modularnoj API strukturi
// Zamijenjeno prema novoj modularnoj API strukturi
import { getMemberMessages, markMessageAsRead, getGenericMessages } from '../../utils/api/apiMessages';
import { ApiGenericMessage } from '../../utils/api/apiTypes';
import BackToDashboard from "../../../components/BackToDashboard";
import { MESSAGE_EVENTS } from "../../utils/events"; // Dodaj import
import { formatDate } from "../../utils/dateUtils";
import { parseDate } from '../../utils/dateUtils';

interface MemberMessage {
  message_id: number;
  message_text: string;
  created_at: string;
  status: 'unread' | 'read' | 'archived';
  sender_id: number | null;
  sender_type: 'member_administrator' | 'member' | 'member_superuser';
  recipient_id: number | null;
  recipient_type: 'member_administrator' | 'member' | 'group' | 'all';
}

const MemberMessageList: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [messages, setMessages] = useState<MemberMessage[]>([]);
  const [genericMessages, setGenericMessages] = useState<ApiGenericMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingGeneric, setLoadingGeneric] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  // Dohvaćanje poruka za člana
  const fetchMemberMessages = useCallback(async () => {
    if (!user?.member_id) return;
    
    try {
      setLoading(true);
      const data = await getMemberMessages(user.member_id);
      
      // Filtriramo samo poruke koje je admin poslao članu
      const receivedMessages = data.filter(msg => 
        (msg.sender_type === 'member_administrator' || msg.sender_type === 'member_superuser') && 
        (String(msg.recipient_id) === String(user.member_id) || msg.recipient_type === 'all')
      );
      
      // Sortiramo poruke silazno - od najnovije prema najstarijoj (kao i kod admin prikaza)
      const sortedMessages = [...receivedMessages].sort((a, b) => {
        const dateA = parseDate(a?.timestamp || '')?.getTime() || 0;
        const dateB = parseDate(b?.timestamp || '')?.getTime() || 0;
        return dateB - dateA;
      });
      
      // Konverzija u lokalni tip MemberMessage
      const convertedMessages = sortedMessages.map(msg => ({
        message_id: Number(msg.id),
        message_text: msg.content,
        created_at: msg.timestamp,
        status: msg.read ? ('read' as const) : ('unread' as const),
        sender_id: Number(msg.sender_id) || null,
        sender_type: msg.sender_type === 'system' ? 'member_administrator' : msg.sender_type,
        recipient_id: Number(msg.recipient_id) || null,
        recipient_type: msg.recipient_type
      }));
      
      setMessages(convertedMessages);
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : 'Nije moguće dohvatiti poruke',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user?.member_id, toast]);

  const fetchGenericMessages = useCallback(async () => {
    try {
      setLoadingGeneric(true);
      const data = await getGenericMessages();
      setGenericMessages(data);
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : 'Nije moguće dohvatiti sistemske poruke',
        variant: "destructive"
      });
    } finally {
      setLoadingGeneric(false);
    }
  }, [toast]);

  // Označavanje poruke kao pročitane
  const handleMarkAsRead = async (messageId: number) => {
    try {
      // Poziv API-ja za označavanje poruke kao pročitane
      await markMessageAsRead(messageId);
      
      // Ažuriranje lokalne liste poruka
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.message_id === messageId 
            ? { ...msg, status: 'read' } 
            : msg
        )
      );
      
      // Emitiraj događaj za osvježavanje brojača u navigaciji
      const event = new CustomEvent(MESSAGE_EVENTS.UNREAD_UPDATED);
      window.dispatchEvent(event);
      
      // Dodatna provjera - malo odgodi i ponovno emitiraj događaj za osvježavanje brojača
      // Ovo osigurava da se brojač osvježi i ako je prva emisija događaja propuštena
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent(MESSAGE_EVENTS.UNREAD_UPDATED));
      }, 500);
      
      // Ne prikazuj toast za automatsko označavanje poruka kao pročitane
      // jer bi to moglo zbuniti korisnika kada napušta stranicu
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : 'Nije moguće označiti poruku kao pročitanu',
        variant: "destructive"
      });
    }
  };

  // Učitavanje poruka kad se komponenta montira
  useEffect(() => {
    if (user?.member_id) {
      void fetchMemberMessages();
    }
    void fetchGenericMessages();
  }, [user?.member_id]); // Ovisimo samo o user.member_id za ponovno dohvaćanje poruka člana
  
  // Automatsko označavanje otvorenih poruka kao pročitanih kada korisnik napusti stranicu ili promijeni filter
  useEffect(() => {
    // Funkcija za čišćenje koja se poziva kada korisnik napusti komponentu ili promijeni filter
    return () => {
      // Pronađi sve nepročitane poruke koje su otvorene (vidljive)
      const openedMessages = messages.filter(message => {
        const messageElement = document.getElementById(`message-content-${message.message_id}`);
        return messageElement && !messageElement.classList.contains('hidden') && message.status === 'unread';
      });
      
      // Označi sve otvorene nepročitane poruke kao pročitane
      // Koristimo Promise.all za paralelno izvršavanje svih zahtjeva
      if (openedMessages.length > 0) {
        console.log(`Označavanje ${openedMessages.length} poruka kao pročitane pri napuštanju stranice`);
        
        // Izvrši sve zahtjeve za označavanje poruka kao pročitane
        Promise.all(openedMessages.map(message => markMessageAsRead(message.message_id)))
          .then(() => {
            // Nakon što su sve poruke označene kao pročitane, emitiraj događaj za osvježavanje brojača
            window.dispatchEvent(new CustomEvent(MESSAGE_EVENTS.UNREAD_UPDATED));
            
            // Dodatna provjera - malo odgodi i ponovno emitiraj događaj za osvježavanje brojača
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent(MESSAGE_EVENTS.UNREAD_UPDATED));
            }, 1000);
          })
          .catch(error => console.error('Greška pri označavanju poruka kao pročitane:', error));
      }
    };
  }, [messages, filter]);

  if (loading || loadingGeneric) {
    return <div className="p-4">Učitavanje poruka...</div>;
  }

  const unreadCount = messages.filter(msg => msg.status === 'unread').length;

  return (
    <>
      {genericMessages.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-800 text-white">
            <CardTitle>Sistemske poruke</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {genericMessages.map((msg) => (
              <div key={msg.id} className="p-4 rounded-md border bg-gray-50">
                <div className="mb-2 text-sm text-gray-500">{formatDate(msg.timestamp || '', 'dd.MM.yyyy HH:mm:ss')}</div>
                <div className="font-medium mb-1">{msg.sender}</div>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <CardTitle className="flex justify-between items-center">
            <div className="flex items-center">
              <MessageCircle className="mr-2 h-5 w-5" />
              Poruke od administratora
            </div>
            {unreadCount > 0 && (
              <div className="flex items-center bg-white text-blue-800 px-2 py-1 rounded-full text-sm">
                <Bell className="h-4 w-4 mr-1" />
                {unreadCount} {unreadCount === 1 ? 'nepročitana' : 'nepročitanih'}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="mb-4">
            <BackToDashboard />
          </div>
          
          {/* Gumbi za filtriranje poruka */}
          <div className="flex space-x-2 mb-4">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              className="flex items-center space-x-2"
              size="sm"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              <span>Sve poruke</span>
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              onClick={() => setFilter('unread')}
              className="flex items-center space-x-2"
              size="sm"
            >
              <Bell className="h-4 w-4 mr-1" />
              <span>Nepročitane</span>
            </Button>
            <Button
              variant={filter === 'read' ? 'default' : 'outline'}
              onClick={() => setFilter('read')}
              className="flex items-center space-x-2"
              size="sm"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              <span>Pročitane</span>
            </Button>
          </div>
          
          {messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nemate poruka od administratora
            </div>
          ) : messages.filter(msg => {
              if (filter === 'all') return true;
              if (filter === 'unread') return msg.status === 'unread';
              if (filter === 'read') return msg.status === 'read';
              return true;
            }).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nema {filter === 'unread' ? 'nepročitanih' : filter === 'read' ? 'pročitanih' : ''} poruka
            </div>
          ) : (
            <div className="space-y-4">
              {/* Filtriraj poruke prema odabranom filteru */}
              {messages
                .filter(message => {
                  if (filter === 'all') return true;
                  if (filter === 'unread') return message.status === 'unread';
                  if (filter === 'read') return message.status === 'read';
                  return true;
                })
                .map((message) => {
                // Uzmi prvih 50 znakova poruke za pregled
                const previewText = message.message_text.length > 50 
                  ? `${message.message_text.substring(0, 50)}...` 
                  : message.message_text;
                
                return (
                  <div 
                    key={message.message_id} 
                    className={`p-4 rounded-md border cursor-pointer transition-all hover:shadow-md ${
                      message.status === 'unread' 
                        ? 'border-blue-300 bg-blue-50' 
                        : 'border-gray-200'
                    }`}
                    onClick={() => {
                      // Samo otvaranje/zatvaranje detalja poruke bez automatskog označavanja kao pročitano
                      const messageElement = document.getElementById(`message-content-${message.message_id}`);
                      if (messageElement) {
                        if (messageElement.classList.contains('hidden')) {
                          messageElement.classList.remove('hidden');
                        } else {
                          messageElement.classList.add('hidden');
                        }
                      }
                    }}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {message.status === 'unread' ? (
                          <span className="w-2 h-2 bg-blue-500 rounded-full" title="Nepročitana poruka"></span>
                        ) : (
                          <span className="flex items-center text-green-600" title="Pročitana poruka">
                            <CheckCircle className="h-4 w-4 mr-1" />
                          </span>
                        )}
                        <div className="text-sm font-medium">
                          {message.sender_type === 'member_administrator' ? 'Administrator' : 
                           message.sender_type === 'member_superuser' ? 'Super Administrator' : 'Sistem'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-500">
                          {formatDate(message.created_at, 'dd.MM.yyyy HH:mm')}
                        </div>
                        <div className={`text-xs px-2 py-0.5 rounded-full ${message.status === 'unread' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                          {message.status === 'unread' ? 'Nepročitano' : 'Pročitano'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Pregled poruke */}
                    <div className="text-sm text-gray-700">{previewText}</div>
                    
                    {/* Puni sadržaj poruke - sakriven po defaultu */}
                    <div id={`message-content-${message.message_id}`} className="mt-3 pt-3 border-t border-gray-200 whitespace-pre-wrap hidden">
                      <div className="mb-3">{message.message_text}</div>
                      {message.recipient_type === 'all' && (
                        <div className="mt-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded inline-block">
                          Poslano svim članovima
                        </div>
                      )}
                      {/* Uklonjen gumb za označavanje kao pročitano za članove */}
                    </div>
                  </div>
                );
              })}
              
              <Button
                variant="outline"
                onClick={() => { void fetchMemberMessages(); }}
                className="w-full"
              >
                Osvježi poruke
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default MemberMessageList;
