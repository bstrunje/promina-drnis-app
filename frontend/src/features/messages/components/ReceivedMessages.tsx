import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  getAdminMessages, 
  getMemberMessages, 
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
import { useAuth as useAuthHook } from '@/context/AuthContext';

interface ReceivedMessagesProps {
  userRole: string;
  onUnreadCountChange: (count: number) => void;
}

export default function ReceivedMessages({ userRole, onUnreadCountChange }: ReceivedMessagesProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuthHook();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'unread' | 'read' | 'archived'>('unread');

  // Učitaj poruke pri prvom renderiranju
  // Zamotaj fetchMessages u useCallback
const fetchMessages = useCallback(async () => {
  setLoading(true);
  try {
    let apiData;
    if (userRole === 'member' && user?.member_id) {
      // Ako je običan član, dohvati njegove poruke
      apiData = await getMemberMessages(user.member_id);
    } else {
      // Inače, dohvati poruke za admina
      // Koristi forceLoad=true jer je korisnik aktivno na dijelu aplikacije gdje se prikazuju poruke
      apiData = await getAdminMessages(true);
    }

    const convertedData = convertApiMessagesToMessages(apiData);
    setMessages(convertedData);
    const unreadCount = convertedData.filter(m => m.status === 'unread').length;
    onUnreadCountChange(unreadCount);
  } catch (error: any) {
    // Prikazujemo grešku samo ako je refresh već pokušan i nije uspio
    if (error?.config?._retry === true) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('receivedMessages.messages.fetchError'),
        variant: "destructive"
      });
    }
    // Inače, ne prikazujemo grešku korisniku (tihi retry)
  } finally {
    setLoading(false);
  }
}, [userRole, user?.member_id, toast, onUnreadCountChange]);

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
        title: t('common.success'),
        description: t('receivedMessages.messages.markAsReadSuccess'),
        variant: "success"
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('receivedMessages.messages.markAsReadError'),
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
        title: t('common.success'),
        description: t('receivedMessages.messages.archiveSuccess'),
        variant: "success"
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('receivedMessages.messages.archiveError'),
        variant: "destructive"
      });
    }
  };

  // Funkcija za brisanje poruke
  const onDelete = async (messageId: number) => {
    if (!window.confirm(t('receivedMessages.confirmDialogs.deleteMessage'))) {
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
        title: t('common.success'),
        description: t('receivedMessages.messages.deleteSuccess'),
        variant: "success"
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('receivedMessages.messages.deleteError'),
        variant: "destructive"
      });
    }
  };

  // Funkcija za brisanje svih poruka
  const onDeleteAll = async () => {
    if (!window.confirm(t('receivedMessages.confirmDialogs.deleteAllMessages'))) {
      return;
    }
    
    try {
      await deleteAllMessages();
      
      // Ažuriraj lokalno stanje
      setMessages([]);
      
      // Resetiraj brojač nepročitanih poruka
      onUnreadCountChange(0);
      
      toast({
        title: t('common.success'),
        description: t('receivedMessages.messages.deleteAllSuccess'),
        variant: "success"
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('receivedMessages.messages.deleteAllError'),
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
            <span className="hidden sm:inline">{t('receivedMessages.buttons.unread')}</span>
          </Button>
          <Button
            variant={filter === 'read' ? 'default' : 'outline'}
            onClick={() => setFilter('read')}
            className="flex items-center space-x-2"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{t('receivedMessages.buttons.read')}</span>
          </Button>
          <Button
            variant={filter === 'archived' ? 'default' : 'outline'}
            onClick={() => setFilter('archived')}
            className="flex items-center space-x-2"
          >
            <Archive className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{t('receivedMessages.buttons.archived')}</span>
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
                  <span className="hidden sm:inline">{t('messages.deleteAll')}</span>
                  <span className="sm:hidden">{t('messages.deleteAllShort')}</span>
                </Button>
              </div>
            )}

            {filteredMessages.map((message) => {
              // Uzmi prvih 50 znakova poruke za pregled
              const previewText = message.message_text.length > 50 
                ? `${message.message_text.substring(0, 50)}...` 
                : message.message_text;
                
              return (
                <Card 
                  key={message.message_id} 
                  className={`${message.status === 'unread' ? 'border-blue-500' : ''} cursor-pointer hover:shadow-md transition-all`}
                  onClick={() => {
                    // Samo otvaranje/zatvaranje detalja poruke bez automatskog označavanja kao pročitano
                    const messageElement = document.getElementById(`admin-message-content-${message.message_id}`);
                    if (messageElement) {
                      if (messageElement.classList.contains('hidden')) {
                        messageElement.classList.remove('hidden');
                      } else {
                        messageElement.classList.add('hidden');
                      }
                    }
                  }}
                >
                  <CardHeader>
                    <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2">
                        {message.status === 'unread' && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full" title="Nepročitana poruka"></span>
                        )}
                        <span>{message.sender_name}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {/* Uklonili smo gumbe za označavanje kao pročitano */}
                        {message.status !== 'archived' && (
                          <Button 
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { 
                              e.stopPropagation(); // Spriječi da klik na gumb aktivira klik na karticu
                              void onArchive(message.message_id); 
                            }}
                            title="Arhiviraj poruku"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                        {userRole === 'member_superuser' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { 
                              e.stopPropagation(); // Spriječi da klik na gumb aktivira klik na karticu
                              void onDelete(message.message_id); 
                            }}
                            className="text-red-500 hover:text-red-700"
                            title="Obriši poruku"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-2 text-gray-500 text-sm">
  {formatDate(message.created_at, 'dd.MM.yyyy HH:mm')}
</div>
                    
                    {/* Pregled poruke */}
                    <p className="text-sm text-gray-700">{previewText}</p>
                    
                    {/* Puni sadržaj poruke - sakriven po defaultu */}
                    <div id={`admin-message-content-${message.message_id}`} className="mt-3 pt-3 border-t border-gray-200 whitespace-pre-wrap hidden">
                      <div className="mb-3">{message.message_text}</div>
                      
                      {message.status === 'unread' && (
                        <div className="mt-4">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => { 
                              e.stopPropagation(); // Spriječi da klik na gumb aktivira klik na karticu
                              void onMarkAsRead(message.message_id); 
                            }}
                            className="flex items-center"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            <span>Označi kao pročitano</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
