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
  sender_type: 'admin' | 'member';
  recipient_id: number | null;
  recipient_type: 'admin' | 'member' | 'group' | 'all';
}

const MemberMessageList: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [messages, setMessages] = useState<MemberMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [genericMessages, setGenericMessages] = useState<ApiGenericMessage[]>([]);
  const [loadingGeneric, setLoadingGeneric] = useState(true);

  // Dohvaćanje poruka za člana
  const fetchMemberMessages = useCallback(async () => {
    if (!user?.member_id) return;
    
    try {
      setLoading(true);
      const data = await getMemberMessages(user.member_id);
      
      // Filtriramo samo poruke koje je admin poslao članu
      const receivedMessages = data.filter(msg => 
        msg.sender_type === 'admin' && 
        (String(msg.recipient_id) === String(user.member_id) || msg.recipient_type === 'all')
      );
      
      // Sortiramo poruke silazno - od najnovije prema najstarijoj (kao i kod admin prikaza)
      const sortedMessages = [...receivedMessages].sort(
        (a, b) => {
          // Potpuna null provjera
          const timestampA = a && typeof a === 'object' && a.timestamp ? a.timestamp : '';
          const timestampB = b && typeof b === 'object' && b.timestamp ? b.timestamp : '';
          
          // Siguran pristup getTime
          let dateA = 0;
          let dateB = 0;
          try {
            const parsedDateA = parseDate(timestampA);
            if (parsedDateA) {
              dateA = parsedDateA.getTime();
            }
          } catch { /* ignoriramo greške */ }
          
          try {
            const parsedDateB = parseDate(timestampB);
            if (parsedDateB) {
              dateB = parsedDateB.getTime();
            }
          } catch { /* ignoriramo greške */ }
          return dateB - dateA;
        }
      );
      
      // Konverzija u lokalni tip MemberMessage
      const convertedMessages = sortedMessages.map(msg => ({
        message_id: Number(msg.id),
        message_text: msg.content,
        created_at: msg.timestamp,
        status: msg.read ? ('read' as const) : ('unread' as const),
        sender_id: Number(msg.sender_id) || null,
        sender_type: msg.sender_type === 'system' ? 'admin' : msg.sender_type,
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
      
      toast({
        title: "Uspjeh",
        description: "Poruka označena kao pročitana",
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

  // Učitavanje poruka kad se komponenta montira
  useEffect(() => {
    void fetchMemberMessages();
    void fetchGenericMessages();
  }, [user?.member_id, fetchMemberMessages, fetchGenericMessages]);

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
          {messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nemate poruka od administratora
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div 
                  key={message.message_id} 
                  className={`p-4 rounded-md border ${
                    message.status === 'unread' 
                      ? 'border-blue-300 bg-blue-50' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-sm text-gray-500">
                        {formatDate(message.created_at, 'dd.MM.yyyy HH:mm:ss')}
                      </div>
                      {message.recipient_type === 'all' && (
                        <div className="mt-1 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded inline-block">
                          Poslano svim članovima
                        </div>
                      )}
                    </div>
                    {message.status === 'unread' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { void handleMarkAsRead(message.message_id); }}
                        className="h-8 text-xs"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Označi kao pročitano
                      </Button>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap">{message.message_text}</div>
                </div>
              ))}
              
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
