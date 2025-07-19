import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { useToast } from "@components/ui/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@components/ui/collapsible';
import { Separator } from '@components/ui/separator';
import { Badge } from '@components/ui/badge';
import { Bell, CheckCircle, MessageCircle, AlertCircle, ChevronDown, ChevronUp, Mail, RefreshCw, Send } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Message as MessageType } from './types/messageTypes';
import { getMemberMessages, markMessageAsRead, getMemberSentMessages, getGenericMessages } from '../../utils/api/apiMessages';
import { convertApiMessagesToMessages, convertMemberApiMessageToMessage } from './utils/messageConverters';
import SentMessageCard from './components/SentMessageCard';
import { ApiAdminMessage, ApiGenericMessage } from '../../utils/api/apiTypes';
import BackToDashboard from "../../../components/BackToDashboard";
import { MESSAGE_EVENTS } from "../../utils/events"; // Dodaj import
import { formatDate } from "../../utils/dateUtils";
import { parseDate } from '../../utils/dateUtils';

interface MemberMessageRecipient {
  member_id: number;
  read_at: string | null; // Koristimo string jer JSON ne podržava Date objekte direktno
  full_name?: string; // Ime člana, ako ga backend pošalje
}

interface MemberMessage {
  message_id: number;
  message_text: string;
  created_at: string;
  status: 'unread' | 'read' | 'archived';
  sender_id: number | null;
  sender_type: 'member_administrator' | 'member' | 'member_superuser';
  recipient_id: number | null;
  recipient_type: 'member_administrator' | 'member' | 'group' | 'all';
  read_by?: MemberMessageRecipient[]; // Lista primatelja i njihov status čitanja
}

const MemberMessageList: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [openCollapsibleId, setOpenCollapsibleId] = useState<number | null>(null);
  const openedMessageIdsRef = useRef<Set<number>>(new Set());
  const [sentMessages, setSentMessages] = useState<MessageType[]>([]);
  const [genericMessages, setGenericMessages] = useState<ApiGenericMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSent, setLoadingSent] = useState(true);
  const [loadingGeneric, setLoadingGeneric] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('unread');
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  // Dohvaćanje poruka za člana
  const fetchMessages = useCallback(async () => {
    if (!user?.member_id) return;

    try {
      setLoading(true);
      const apiData = await getMemberMessages(user.member_id);
      const convertedData = convertApiMessagesToMessages(apiData);
      setMessages(convertedData);
    } catch (error) {
      toast({
        title: t('messages.error'),
        description: error instanceof Error ? error.message : t('messages.fetchMessagesError'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user?.member_id, toast]);

  // Dohvaćanje poslanih poruka člana
  const fetchSentMessages = useCallback(async () => {
    if (!user) return;
    setLoadingSent(true);
    try {
      const apiData = await getMemberSentMessages();
      const convertedData = apiData.map(convertMemberApiMessageToMessage);
      setSentMessages(convertedData);
    } catch (error) {
      console.error("Error fetching sent messages:", error);
      toast({
        title: t('messages.error'),
        description: t('messages.fetchSentMessagesError'),
        variant: "destructive",
      });
    }
    setLoadingSent(false);
  }, [user, toast]);

  // Označavanje poruke kao pročitane
  const handleMarkAsRead = useCallback(async (messageId: number) => {
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
        title: t('messages.error'),
        description: error instanceof Error ? error.message : 'Unable to mark message as read',
        variant: "destructive"
      });
    }
  }, [toast]);

  // Efekt koji se pokreće samo jednom, prilikom napuštanja komponente
  useEffect(() => {
    // Vraća funkciju za čišćenje (cleanup function) koja se poziva na unmount
    return () => {
      // Prođi kroz sve poruke čiji su ID-jevi spremljeni u ref i označi ih kao pročitane
      openedMessageIdsRef.current.forEach(messageId => {
        // Ovdje ne možemo direktno provjeriti status iz 'messages' state-a jer je closure star.
        // API poziv će se pobrinuti da ne radi ništa ako je poruka već pročitana.
        void handleMarkAsRead(messageId);
      });
    };
  // Prazan niz ovisnosti osigurava da se ovaj efekt pokrene samo na mount, a cleanup na unmount.
  // handleMarkAsRead je uključen jer je vanjski scope, ali je stabiliziran sa useCallback.
  }, [handleMarkAsRead]);

  const handleRefresh = () => {
    if (activeTab === 'received') {
      void fetchMessages();
    } else {
      void fetchSentMessages();
    }
  };

  // Učitavanje poruka kad se komponenta montira
  useEffect(() => {
    if (user) {
      fetchMessages();
      fetchSentMessages();
      // fetchGenericMessages(); // Uklonjeno jer uzrokuje greške
    }
    // Postavljanje intervala za periodično dohvaćanje
    const interval = setInterval(() => {
      if (user) {
        fetchMessages();
        fetchSentMessages();
        // fetchGenericMessages(); // Uklonjeno jer uzrokuje greške
      }
    }, 30000); // 30 sekundi

    return () => clearInterval(interval);
  }, [activeTab, fetchMessages, fetchSentMessages]); // Ovisimo o user.member_id i funkcijama za dohvat poruka



  if (loading) {
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
              {activeTab === 'received' ? t('memberMessageList.titles.adminMessages') : t('memberMessageList.titles.sentMessages')}
            </div>
            {activeTab === 'received' && unreadCount > 0 && (
              <div className="flex items-center bg-white text-blue-800 px-2 py-1 rounded-full text-sm">
                <Bell className="h-4 w-4 mr-1" />
                {unreadCount} {unreadCount === 1 ? t('memberMessageList.unreadCount.single') : t('memberMessageList.unreadCount.multiple')}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="mb-4">
            <BackToDashboard />
          </div>

          {/* Gumbi za prebacivanje između primljenih i poslanih poruka */}
          <div className="flex space-x-2 mb-4">
            <Button
              variant={activeTab === 'received' ? 'default' : 'outline'}
              onClick={() => setActiveTab('received')}
              className="flex items-center space-x-2"
              size="sm"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              <span>{t('memberMessageList.tabs.received')}</span>
            </Button>
            <Button
              variant={activeTab === 'sent' ? 'default' : 'outline'}
              onClick={() => setActiveTab('sent')}
              className="flex items-center space-x-2"
              size="sm"
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              <span>{t('memberMessageList.tabs.sent')}</span>
            </Button>
          </div>

          {/* Gumbi za filtriranje poruka - prikazuju se samo za primljene poruke */}
          {activeTab === 'received' && (
            <div className="px-4 pb-4 border-b">
              <div className="flex space-x-2">
                <Button
                  onClick={() => setFilter('unread')}
                  variant={filter === 'unread' ? 'default' : 'outline'}
                  className="flex items-center"
                >
                  <Bell className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t('memberMessageList.filters.unread')}</span>
                </Button>
                <Button
                  onClick={() => setFilter('read')}
                  variant={filter === 'read' ? 'default' : 'outline'}
                  className="flex items-center"
                >
                  <CheckCircle className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t('memberMessageList.filters.read')}</span>
                </Button>
                <Button
                  onClick={() => setFilter('all')}
                  variant={filter === 'all' ? 'default' : 'outline'}
                  className="flex items-center"
                >
                  <MessageCircle className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t('memberMessageList.filters.all')}</span>
                </Button>
              </div>
            </div>
          )}

          {/* Prikaz primljenih poruka */}
          {activeTab === 'received' && (
            messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {t('memberMessageList.emptyStates.noReceivedMessages')}
              </div>
            ) : messages.filter(msg => {
              if (filter === 'all') return true;
              if (filter === 'unread') return msg.status === 'unread';
              if (filter === 'read') return msg.status === 'read';
              return true;
            }).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {filter === 'unread' ? t('memberMessageList.emptyStates.noUnreadMessages') : filter === 'read' ? t('memberMessageList.emptyStates.noReadMessages') : ''}
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
                        className={`p-4 rounded-md border cursor-pointer transition-all hover:shadow-md ${message.status === 'unread'
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200'
                          }`}
                        onClick={() => {
                          const messageElement = document.getElementById(`message-content-${message.message_id}`);
                          messageElement?.classList.toggle('hidden');

                          // Ako je poruka nepročitana i upravo je otvorena, dodaj njen ID u ref
                          if (message.status === 'unread' && !messageElement?.classList.contains('hidden')) {
                            openedMessageIdsRef.current.add(message.message_id);
                          }
                        }}
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {message.status === 'read' && (
                              <span className="flex items-center text-green-600" title={t('messages.readMessageTitle')}>
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
                              {t('memberMessageList.badges.sentToAll')}
                            </div>
                          )}
                          {/* Uklonjen gumb za označavanje kao pročitano za članove */}
                        </div>
                      </div>
                    );
                  })}

                <Button
                  variant="outline"
                  onClick={() => { void fetchMessages(); }}
                  className="w-full"
                >
                  {t('memberMessageList.buttons.refreshMessages')}
                </Button>
              </div>
            )
          )}

          {/* Prikaz poslanih poruka */}
          {activeTab === 'sent' && (
            <div>
              {loadingSent ? (
                <div className="text-center p-4">{t('memberMessageList.loading.sentMessages')}</div>
              ) : sentMessages.length > 0 ? (
                <div>
                  {sentMessages.map(message => (
                    <SentMessageCard
                      key={message.message_id}
                      message={message as MessageType}
                      currentUserId={user?.member_id}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center p-4 text-gray-500">{t('memberMessageList.emptyStates.noSentMessages')}</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default MemberMessageList;
