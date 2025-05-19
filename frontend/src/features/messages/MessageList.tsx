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
import { useAuth } from '../../context/AuthContext';
import AdminMessageSender from './AdminMessageSender';
import MemberMessageList from './MemberMessageList';
import BackToDashboard from '../../../components/BackToDashboard';
import ReceivedMessages from './components/ReceivedMessages';
import SentMessages from './components/SentMessages';

export default function MessageList() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'compose'>('received');
  const [unreadCount, setUnreadCount] = useState(0);

  // Ako je običan član, prikaži pojednostavljeni prikaz poruka
  if (user?.role === 'member') {
    return <MemberMessageList />;
  }

  // Funkcija za ažuriranje broja nepročitanih poruka
  const handleUnreadCountChange = (count: number) => {
    setUnreadCount(count);
  };

  // Ako je admin ili superuser, prikaži puni administratorski prikaz poruka
  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg text-white p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">Poruke</h1>
            <p className="opacity-90">Komunikacija s članovima</p>
          </div>
          {activeTab === 'received' && (
            <div className="flex items-center space-x-2">
              <Bell className="h-6 w-6" />
              <span className="text-lg font-bold">{unreadCount} nepročitano</span>
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
            <span className="hidden sm:inline">Primljene poruke</span>
            <span className="sm:hidden">Primljene</span>
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center">
            <Send className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Poslane poruke</span>
            <span className="sm:hidden">Poslane</span>
          </TabsTrigger>
          <TabsTrigger value="compose" className="flex items-center">
            <PlusCircle className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Nova poruka</span>
            <span className="sm:hidden">Nova</span>
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
