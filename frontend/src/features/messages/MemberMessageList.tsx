import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { useToast } from "@components/ui/use-toast";
// import {
//   Collapsible,
//   CollapsibleContent,
//   CollapsibleTrigger,
// } from '@components/ui/collapsible';
// import { Separator } from '@components/ui/separator';
// import { Badge } from '@components/ui/badge';
import { Bell, CheckCircle, MessageCircle } from "lucide-react";
import { useAuth } from "@/context/useAuth";
import { Message as MessageType } from './types/messageTypes';
import { getMemberMessages, markMessageAsRead, getMemberSentMessages } from '../../utils/api/apiMessages';
import { convertApiMessagesToMessages, convertMemberApiMessageToMessage } from './utils/messageConverters';
import SentMessageCard from './components/SentMessageCard';
import { ApiGenericMessage } from '../../utils/api/apiTypes';
import BackToDashboard from "../../../components/BackToDashboard";
import { MESSAGE_EVENTS } from "../../utils/events"; // Dodaj import
import { formatDate } from "../../utils/dateUtils";
// import { parseDate } from '../../utils/dateUtils';

// Uklonjeni nekorišteni tipovi MemberMessage/MemberMessageRecipient

const MemberMessageList: React.FC = () => {
  const { t } = useTranslation('messages');
  const { toast } = useToast();
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [openCollapsibleId] = useState<number | null>(null);
  const openedMessageIdsRef = useRef<Set<number>>(new Set());
  const [sentMessages, setSentMessages] = useState<MessageType[]>([]);
  const [genericMessages] = useState<ApiGenericMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSent, setLoadingSent] = useState(true);
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
        title: t('error'),
        description: error instanceof Error ? error.message : t('fetchMessagesError'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user?.member_id, toast, t]);

  // Dohvaćanje poslanih poruka člana
  const fetchSentMessages = useCallback(async () => {
    if (!user) return;
    setLoadingSent(true);
    try {
      const apiData = await getMemberSentMessages();
      const convertedData = apiData.map(convertMemberApiMessageToMessage);
      setSentMessages(convertedData);
    } catch {
      toast({
        title: t('error'),
        description: t('fetchSentMessagesError'),
        variant: "destructive",
      });
    }
    setLoadingSent(false);
  }, [user, toast, t]);

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

    } catch {
      // Ovdje ne prikazujemo toast da ne ometamo korisnika
    }
  }, []); // Prazan niz ovisnosti jer unutra nema vanjskih varijabli

  // EFEKT ZA OZNAČAVANJE PORUKA KAO PROČITANIH
  useEffect(() => {
    // Kopiramo referencu u lokalnu varijablu kako bismo izbjegli promjene tijekom cleanupa
    const openedIdsRef = openedMessageIdsRef.current;
    // Cleanup funkcija se izvršava prije sljedećeg renderiranja ili pri unmountu.
    // Ovo je idealno mjesto za poziv API-ja jer hvatamo sve ID-jeve
    // koji su dodani u ref tijekom prethodnog stanja.
    return () => {
      const idsToMark = Array.from(openedIdsRef);
      if (idsToMark.length > 0) {
        idsToMark.forEach(id => {
          void handleMarkAsRead(id);
        });
        // Isprazni set nakon što smo poslali zahtjeve
        openedIdsRef.clear();
      }
    };
  }, [handleMarkAsRead, openCollapsibleId, filter, activeTab]); // Ponovno pokreni efekt na svaku relevantnu promjenu



  // Uklonjen handleRefresh jer se ne koristi

  // Učitavanje poruka kad se komponenta montira
  useEffect(() => {
    if (user) {
      void fetchMessages();
      void fetchSentMessages();
      // fetchGenericMessages(); // Uklonjeno jer uzrokuje greške
    }
    // Postavljanje intervala za periodično dohvaćanje
    const interval = setInterval(() => {
      if (user) {
        void fetchMessages();
        void fetchSentMessages();
        // fetchGenericMessages(); // Uklonjeno jer uzrokuje greške
      }
    }, 30000); // 30 sekundi

    return () => clearInterval(interval);
  }, [activeTab, fetchMessages, fetchSentMessages, user]); // Ovisimo o user i funkcijama za dohvat poruka



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
                <div className="mb-2 text-sm text-gray-500">{formatDate(msg.timestamp ?? '', 'dd.MM.yyyy HH:mm:ss')}</div>
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
                              <span className="flex items-center text-green-600" title={t('readMessageTitle')}>
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
                      message={message}
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
