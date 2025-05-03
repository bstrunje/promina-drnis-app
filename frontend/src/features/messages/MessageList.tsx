import { useState, useEffect } from 'react';
import { 
  getAdminMessages, 
  markMessageAsRead, 
  archiveMessage, 
  deleteMessage, 
  deleteAllMessages,
  getAdminSentMessages
} from '../../utils/api';
import { useToast } from "@components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { Bell, CheckCircle, Archive, Trash2, Inbox, Send, PlusCircle } from "lucide-react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@components/ui/tabs';
import { useAuth } from '../../context/AuthContext';
import AdminMessageSender from './AdminMessageSender';
import MemberMessageList from './MemberMessageList';
import BackToDashboard from '../../../components/BackToDashboard';

interface Message {
  message_id: number;
  member_id: number;
  sender_name: string;
  message_text: string;
  created_at: string;
  status: 'unread' | 'read' | 'archived';
  sender_id?: number | null;
  sender_type?: 'admin' | 'member';
  recipient_id?: number | null;
  recipient_type?: 'admin' | 'member' | 'group' | 'all';
}

export default function MessageList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSent, setLoadingSent] = useState(true);
  const [filter, setFilter] = useState<'unread' | 'read' | 'archived'>('unread');
  const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'compose'>('received');
  const [showSendForm, setShowSendForm] = useState(false);

  // Dohvaćanje poruka koje su članovi poslali adminu
  const fetchMessages = async () => {
    // Ako je običan član, preskačemo API poziv za admin poruke
    if (user?.role === 'member') {
      setLoading(false);
      return;
    }
    
    try {
      const data = await getAdminMessages();
      setMessages(data);
      setLoading(false);
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : 'Nije moguće dohvatiti poruke',
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  // Dohvaćanje poruka koje je admin poslao članovima
  const fetchSentMessages = async () => {
    // Ako je običan član, preskačemo API poziv za admin poruke
    if (user?.role === 'member') {
      setLoadingSent(false);
      return;
    }
    
    try {
      setLoadingSent(true);
      const data = await getAdminSentMessages();
      setSentMessages(data);
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : 'Nije moguće dohvatiti poslane poruke',
        variant: "destructive"
      });
    } finally {
      setLoadingSent(false);
    }
  };

  const onMarkAsRead = async (messageId: number) => {
    try {
      await markMessageAsRead(messageId);
      await fetchMessages();
      toast({
        title: "Uspjeh",
        description: "Poruka označena kao pročitana",
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : "Nije moguće označiti poruku kao pročitanu",
        variant: "destructive"
      });
    }
  };

  const onArchive = async (messageId: number) => {
    try {
      await archiveMessage(messageId);
      await fetchMessages();
      toast({
        title: "Uspjeh",
        description: "Poruka arhivirana",
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : "Nije moguće arhivirati poruku",
        variant: "destructive"
      });
    }
  };

  const onDelete = async (messageId: number) => {
    try {
      await deleteMessage(messageId);
      setMessages(prevMessages => prevMessages.filter(m => m.message_id !== messageId));
      toast({
        title: "Uspjeh",
        description: "Poruka izbrisana",
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : "Nije moguće izbrisati poruku",
        variant: "destructive"
      });
    }
  };

  const onDeleteAll = async () => {
    try {
      await deleteAllMessages();
      setMessages([]);
      toast({
        title: "Uspjeh",
        description: "Sve poruke izbrisane",
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : "Nije moguće izbrisati sve poruke",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    if (activeTab === 'sent') {
      fetchSentMessages();
    }
  }, [activeTab]);

  // Ako je još u tijeku učitavanje i prikazuju se primljene poruke
  if (loading && activeTab === 'received') {
    return <div className="p-6">Učitavanje...</div>;
  }

  const filteredMessages = messages.filter(message => {
    return message.status === filter;
  });

  const unreadCount = messages.filter(m => m.status === 'unread').length;
  const archivedCount = messages.filter(m => m.status === 'archived').length;
  const readCount = messages.filter(m => m.status === 'read').length;

  // Ako je obični član, prikaži samo poruke koje je admin poslao članu
  if (user?.role === 'member') {
    return <MemberMessageList />;
  }

  // Renderiraj poruke koje su članovi poslali adminu
  const renderReceivedMessages = () => {
    return (
      <>
        <div className="mb-4 border-b pb-2">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={filter === 'unread' ? "default" : "outline"}
              onClick={() => setFilter('unread')}
              size="sm"
              className="flex items-center space-x-1"
            >
              <Bell className="h-4 w-4" />
              <span>Nepročitane ({unreadCount})</span>
            </Button>
            <Button 
              variant={filter === 'read' ? "default" : "outline"}
              onClick={() => setFilter('read')}
              size="sm"
              className="flex items-center space-x-1"
            >
              <Inbox className="h-4 w-4" />
              <span>Pročitane ({readCount})</span>
            </Button>
            <Button 
              variant={filter === 'archived' ? "default" : "outline"}
              onClick={() => setFilter('archived')}
              size="sm"
              className="flex items-center space-x-1"
            >
              <Archive className="h-4 w-4" />
              <span>Arhivirane ({archivedCount})</span>
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredMessages.length > 0 ? (
            <>
              <div className="flex justify-end mb-4">
                <Button
                  variant="destructive"
                  onClick={onDeleteAll}
                  className="flex items-center space-x-2"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Izbriši sve poruke</span>
                  <span className="sm:hidden">Izbriši sve</span>
                </Button>
              </div>

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
                            onClick={() => onMarkAsRead(message.message_id)}
                            className="flex items-center"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Označi kao pročitano</span>
                            <span className="sm:hidden">Pročitano</span>
                          </Button>
                        )}
                        {message.status !== 'archived' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => onArchive(message.message_id)}
                            className="flex items-center"
                          >
                            <Archive className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Arhiviraj</span>
                            <span className="sm:hidden">Arhiv</span>
                          </Button>
                        )}
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => onDelete(message.message_id)}
                          className="flex items-center"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">Izbriši</span>
                          <span className="sm:hidden">Izbriši</span>
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-2 text-sm text-gray-500">
                      {new Date(message.created_at).toLocaleString('hr-HR')}
                    </div>
                    <div className="whitespace-pre-wrap">
                      {message.message_text}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Nema poruka u ovoj kategoriji
            </div>
          )}
        </div>
      </>
    );
  };

  // Renderiraj poruke koje je admin poslao članovima
  const renderSentMessages = () => {
    if (loadingSent) {
      return <div className="p-6">Učitavanje poslanih poruka...</div>;
    }

    return (
      <div className="space-y-4">
        {sentMessages.length > 0 ? (
          sentMessages.map((message) => (
            <Card key={message.message_id}>
              <CardHeader>
                <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex flex-col sm:flex-row sm:items-center">
                    <span>Primatelj: {message.sender_name}</span>
                    {message.recipient_type === 'all' && <span className="ml-0 sm:ml-2 text-blue-600">(Svi članovi)</span>}
                    {message.recipient_type === 'group' && <span className="ml-0 sm:ml-2 text-green-600">(Grupa članova)</span>}
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => onDelete(message.message_id)}
                    className="flex items-center"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Izbriši</span>
                    <span className="sm:hidden">Izbriši</span>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-2 text-sm text-gray-500">
                  {new Date(message.created_at).toLocaleString('hr-HR')}
                </div>
                <div className="whitespace-pre-wrap">
                  {message.message_text}
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Status: {message.status === 'read' ? 'Pročitano' : 'Nepročitano'}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            Niste poslali nijednu poruku članovima
          </div>
        )}
        <Button
          variant="outline"
          onClick={fetchSentMessages}
          className="w-full"
        >
          Osvježi poslane poruke
        </Button>
      </div>
    );
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
          {renderReceivedMessages()}
        </TabsContent>

        <TabsContent value="sent">
          {renderSentMessages()}
        </TabsContent>
        
        <TabsContent value="compose">
          <AdminMessageSender />
        </TabsContent>
      </Tabs>
    </div>
  );
}