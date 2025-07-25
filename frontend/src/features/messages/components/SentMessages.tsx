import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getAdminSentMessages, getMemberSentMessages } from '../../../utils/api/apiMessages';
import { useToast } from "@components/ui/use-toast";
import { Button } from "@components/ui/button";
import { Message as MessageType } from '../types/messageTypes';
import { convertApiMessagesToMessages, convertMemberApiMessageToMessage } from '../utils/messageConverters';
import SentMessageCard from './SentMessageCard';
import { useAuth } from '../../../context/AuthContext';

interface SentMessagesProps {
  userRole: string;
}
export default function SentMessages({ userRole }: SentMessagesProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [sentMessages, setSentMessages] = useState<MessageType[]>([]);
  const [loadingSent, setLoadingSent] = useState(true);

  const fetchSentMessages = useCallback(async (): Promise<void> => {
    console.log('--- PROVJERA ULOGE --- Trenutna userRole je:', userRole);
    setLoadingSent(true);
    try {
      let convertedData: MessageType[];

      if (userRole === 'member') {
        const apiData = await getMemberSentMessages();
        convertedData = apiData.map(convertMemberApiMessageToMessage);
      } else {
        const apiData = await getAdminSentMessages();
        convertedData = convertApiMessagesToMessages(apiData);
      }
      
      // Sortiraj poruke, najnovije prvo
      convertedData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setSentMessages(convertedData);
    } catch (error) {
      toast({
        title: t('messages.error'),
        description: error instanceof Error ? error.message : t('messages.fetchSentMessagesError'),
        variant: "destructive"
      });
    } finally {
      setLoadingSent(false);
    }
  }, [userRole, toast]);

  useEffect(() => {
    void fetchSentMessages();
  }, [fetchSentMessages]);

  useEffect(() => {
    if (userRole === 'member') return;
    const interval = setInterval(() => {
      void fetchSentMessages();
    }, 30000); // 30 sekundi
    // eslint-disable-next-line consistent-return
    return () => clearInterval(interval);
  }, [userRole, fetchSentMessages]);

  return (
    <div>
      <div className="space-y-4">
        {loadingSent ? (
          <div className="text-center p-8">
            <p className="text-gray-500">{t('sentMessages.loading')}</p>
          </div>
        ) : sentMessages.length > 0 ? (
          sentMessages.map(message => (
            <SentMessageCard 
              key={message.message_id} 
              message={message} 
              currentUserId={user?.member_id} 
            />
          ))
        ) : (
          <div className="text-center p-8">
            <p className="text-gray-500">{t('sentMessages.noMessages')}</p>
          </div>
        )}
      </div>
      <div className="mt-4">
        <Button
          variant="outline"
          onClick={() => { void fetchSentMessages(); }}
          className="w-full"
          disabled={loadingSent}
        >
          {loadingSent ? 'Osvježavanje...' : 'Osvježi poslane poruke'}
        </Button>
      </div>
    </div>
  );
}
