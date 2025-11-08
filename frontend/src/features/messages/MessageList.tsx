import { useState } from 'react';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@components/ui/tabs';
import { 
  Inbox, 
  Send, 
  PlusCircle, 
  Bell 
} from "lucide-react";
import { useAuth } from '../../context/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import AdminMessageSender from './AdminMessageSender';
import MemberMessageList from './MemberMessageList';
import BackToDashboard from '../../../components/BackToDashboard';
import ReceivedMessages from './components/ReceivedMessages';
import SentMessages from './components/SentMessages';
import { useTranslation } from 'react-i18next';

export default function MessageList() {
  const { user } = useAuth();
  const { hasPermission, loading } = usePermissions();
  const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'compose'>('received');
  const [unreadCount, setUnreadCount] = useState(0);
  const { t } = useTranslation('messages');

  // Provjeri ima li korisnik dozvole za slanje grupnih poruka ili upravljanje porukama
  const canSendGroupMessages = hasPermission('can_send_group_messages');
  const canManageMessages = hasPermission('can_manage_all_messages');
  const hasMessagePermissions = canSendGroupMessages || canManageMessages;

  // Ako se još učitavaju dozvole, prikaži loading
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Učitavanje...</div>
      </div>
    );
  }

  // Ako je običan član bez posebnih dozvola, prikaži pojednostavljeni prikaz poruka
  if (user?.role === 'member' && !hasMessagePermissions) {
    return <MemberMessageList />;
  }

  // Funkcija za ažuriranje broja nepročitanih poruka
  const handleUnreadCountChange = (count: number) => {
    setUnreadCount(count);
  };

  // Ako je admin ili superuser, prikaži puni administratorski prikaz poruka
  return (
    <div className="p-4 sm:p-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg text-white p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">{t('messageList.title')}</h1>
            <p className="opacity-90">{t('messageList.subtitle')}</p>
          </div>
          {activeTab === 'received' && (
            <div className="flex items-center space-x-2">
              <Bell className="h-6 w-6" />
              <span className="text-lg font-bold">{t('messageList.unreadCount',{ count: unreadCount })}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <BackToDashboard />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'received' | 'sent' | 'compose')}
        className="mb-6"
      >
        <TabsList className="w-full mb-4">
          <TabsTrigger value="received" className="flex items-center">
            <Inbox className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('messageList.tabs.receivedFull')}</span>
            <span className="sm:hidden">{t('messageList.tabs.receivedShort')}</span>
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center">
            <Send className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('messageList.tabs.sentFull')}</span>
            <span className="sm:hidden">{t('messageList.tabs.sentShort')}</span>
          </TabsTrigger>
          <TabsTrigger value="compose" className="flex items-center">
            <PlusCircle className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">{t('messageList.tabs.composeFull')}</span>
            <span className="sm:hidden">{t('messageList.tabs.composeShort')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received">
          <ReceivedMessages 
            userRole={user?.role ?? 'member'} 
            onUnreadCountChange={handleUnreadCountChange} 
          />
        </TabsContent>

        <TabsContent value="sent">
          <SentMessages userRole={user?.role ?? 'member'} />
        </TabsContent>
        
        <TabsContent value="compose">
          <AdminMessageSender />
        </TabsContent>
      </Tabs>
    </div>
  );
}
