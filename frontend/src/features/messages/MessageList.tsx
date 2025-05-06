import { useState, useEffect } from 'react';
import { 
  getAdminMessages, 
  markMessageAsRead, 
  archiveMessage, 
  deleteMessage, 
  deleteAllMessages,
  getAdminSentMessages,
  getAllMembers
} from '../../utils/api';
import { useToast } from "@components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { 
  Bell, 
  CheckCircle, 
  Archive, 
  Trash2, 
  Inbox, 
  Send, 
  PlusCircle, 
  ChevronDown, 
  ChevronRight, 
  Users, 
  UserCheck 
} from "lucide-react";
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
import { MESSAGE_EVENTS } from '../../utils/events';
import { formatDate } from "../../utils/dateUtils";

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

interface MessageGroup {
  messages: Message[];
  key: string;
  isExpanded: boolean;
}

interface Member {
  member_id: number;
  full_name: string;
  membership_type?: string;
  detailed_status?: {
    status: string;
  };
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
  const [groupedMessages, setGroupedMessages] = useState<MessageGroup[]>([]);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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
      setUnreadCount(data.filter(m => m.status === 'unread').length);
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : 'Nije moguće dohvatiti poruke',
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  // Funkcija za dohvaćanje poruka koje je admin poslao članovima
  const fetchSentMessages = async () => {
    // Ako je običan član, preskačemo API poziv za admin poruke
    if (user?.role === 'member') {
      setLoadingSent(false);
      return;
    }
    
    try {
      setLoadingSent(true);
      const data = await getAdminSentMessages();
      
      // Predprocesiranje podataka za konzistentnost
      const processedData = data.map(message => {
        // Osiguravamo konzistentnost između sender_name i recipient_type
        // Ako je poruka označena kao "All Members", dosljednost traži da recipient_type bude 'all'
        if (message.sender_name === 'All Members') {
          return {
            ...message,
            recipient_type: 'all'
          };
        }
        return message;
      });
      
      setSentMessages(processedData);
      
      // Dohvati popis svih članova za poruke poslane svim članovima
      if (processedData.some(msg => msg.recipient_type === 'all' || msg.sender_name === 'All Members')) {
        try {
          const membersData = await getAllMembers();
          
          // Filtriramo samo redovne članove prema definiciji iz MemberTable komponente:
          // status = "registered" i membership_type = "regular"
          const regularMembers = membersData
            .filter(member => 
              member.detailed_status?.status === 'registered' && 
              member.membership_type === 'regular'
            )
            .sort((a, b) => a.full_name.localeCompare(b.full_name, 'hr'));
          
          setAllMembers(regularMembers);
        } catch (error) {
          console.error('Greška pri dohvaćanju svih članova:', error);
        }
      }
      
      // Grupiranje poruka nakon dohvaćanja
      groupSentMessages(processedData);
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
      
      // Ažuriraj lokalni state
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.message_id === messageId 
            ? { ...msg, status: 'read' } 
            : msg
        )
      );
      
      // Ažuriraj broj nepročitanih poruka
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Emitiraj događaj za osvježavanje brojača u navigaciji
      const event = new CustomEvent(MESSAGE_EVENTS.UNREAD_UPDATED);
      window.dispatchEvent(event);
      
      toast({
        title: "Poruka označena",
        description: "Poruka je označena kao pročitana",
      });
      
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : 'Nije moguće označiti poruku kao pročitanu',
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

  // Funkcija za grupiranje poruka po sadržaju, tipu primatelja i vremenu
  const groupSentMessages = (messages: Message[]) => {
    const messageGroups: Record<string, Message[]> = {};
    
    messages.forEach(message => {
      // Poruke poslane svim članovima trebaju UVIJEK biti tretirane kao grupne poruke
      if (message.recipient_type === 'all' || message.sender_name === 'All Members') {
        // Za poruke svim članovima - formatiraj datum bez sekundi za grupiranje
        const dateWithoutSeconds = new Date(message.created_at).toISOString().slice(0, 16);
        const key = `all-${message.message_text}-${dateWithoutSeconds}`;
        
        if (!messageGroups[key]) {
          messageGroups[key] = [];
        }
        messageGroups[key].push(message);
      } 
      else if (message.recipient_type === 'group') {
        // Za grupne poruke - formatiraj datum bez sekundi za grupiranje
        const dateWithoutSeconds = new Date(message.created_at).toISOString().slice(0, 16);
        const key = `group-${message.message_text}-${dateWithoutSeconds}`;
        
        if (!messageGroups[key]) {
          messageGroups[key] = [];
        }
        messageGroups[key].push(message);
      } else {
        // Za pojedinačne poruke ne radimo grupiranje
        const key = `individual-${message.message_id}`;
        messageGroups[key] = [message];
      }
    });
    
    // Pretvori object u niz grupa s expanded statusom
    const groups = Object.entries(messageGroups).map(([key, messages]) => ({
      key,
      messages,
      isExpanded: false
    }));
    
    // Sortiraj grupe po vremenu slanja - najnovije prvo
    groups.sort((a, b) => {
      const dateA = new Date(a.messages[0].created_at).getTime();
      const dateB = new Date(b.messages[0].created_at).getTime();
      return dateB - dateA;  // Descendirajući redoslijed (najnovije prvo)
    });
    
    setGroupedMessages(groups);
  };
  
  // Funkcija za promjenu stanja proširenja grupe
  const toggleGroupExpand = (groupIndex: number) => {
    setGroupedMessages(prevGroups => {
      const newGroups = [...prevGroups];
      newGroups[groupIndex] = {
        ...newGroups[groupIndex],
        isExpanded: !newGroups[groupIndex].isExpanded
      };
      return newGroups;
    });
  };

  // Ako je još u tijeku učitavanje i prikazuju se primljene poruke
  if (loading && activeTab === 'received') {
    return <div className="p-6">Učitavanje...</div>;
  }

  const filteredMessages = messages.filter(message => {
    return message.status === filter;
  });

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
              <span>Pročitane</span>
            </Button>
            <Button 
              variant={filter === 'archived' ? "default" : "outline"}
              onClick={() => setFilter('archived')}
              size="sm"
              className="flex items-center space-x-1"
            >
              <Archive className="h-4 w-4" />
              <span>Arhivirane</span>
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
                      {formatDate(message.created_at, 'dd.MM.yyyy HH:mm:ss')}
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
        {groupedMessages.length > 0 ? (
          groupedMessages.map((group, groupIndex) => {
            const isGrouped = group.messages.length > 1;
            const firstMessage = group.messages[0];
            
            // Provjera je li poruka za sve članove (bilo kojeg tipa 'all' ili sender_name 'All Members')
            const isAllMembersMessage = firstMessage.recipient_type === 'all' || 
                                        firstMessage.sender_name === 'All Members';
                                        
            // Uvijek koristi grupni prikaz za poruke svim članovima
            if (!isGrouped && !isAllMembersMessage) {
              // Prikaz samo za stvarno pojedinačne poruke (ne one za sve članove)
              return (
                <Card key={`individual-${firstMessage.message_id}`}>
                  <CardHeader>
                    <CardTitle className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <span>
                          Primatelj: {firstMessage.sender_name}
                        </span>
                      </div>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => onDelete(firstMessage.message_id)}
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
                      {formatDate(firstMessage.created_at, 'dd.MM.yyyy HH:mm:ss')}
                    </div>
                    <div className="whitespace-pre-wrap">
                      {firstMessage.message_text}
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      <span>
                        Status: {firstMessage.status === 'read' ? 'Pročitano' : 'Nepročitano'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            } else {
              // Koristimo ovaj prikaz za stvarno grupne poruke I poruke svim članovima
              const readCount = group.messages.filter(m => m.status === 'read').length;
              // Za poruke svim članovima, brojač prikazuje broj članova iz dohvaćene liste svih članova
              const recipientsCount = isAllMembersMessage && allMembers.length > 0 
                ? allMembers.length 
                : group.messages.length;
              
              return (
                <Card key={`group-${groupIndex}`}>
                  <CardHeader 
                    onClick={() => toggleGroupExpand(groupIndex)} 
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <CardTitle className="flex justify-between items-center">
                      <div className="flex flex-wrap items-center">
                        {isAllMembersMessage ? (
                          // Poruke za sve članove - plava ikona i oznaka "Svi članovi"
                          <div className="flex items-center">
                            <UserCheck className="h-5 w-5 mr-2 text-blue-600" />
                            <span className="font-medium">Svi članovi</span>
                            <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                              {recipientsCount}/{readCount} pročitano
                            </span>
                          </div>
                        ) : firstMessage.recipient_type === 'group' ? (
                          // Grupne poruke - zelena ikona i oznaka "Grupa članova"
                          <div className="flex items-center">
                            <Users className="h-5 w-5 mr-2 text-green-600" />
                            <span className="font-medium">Grupa članova</span>
                            <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                              {recipientsCount}/{readCount} pročitano
                            </span>
                          </div>
                        ) : (
                          // Pojedinačne poruke (fallback) - prikazujemo bez posebne ikone
                          <div className="flex items-center">
                            <UserCheck className="h-5 w-5 mr-2 text-gray-600" />
                            <span className="font-medium">Pojedinačna poruka</span>
                          </div>
                        )}
                      </div>
                      {group.isExpanded ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-2 text-sm text-gray-500">
                      {formatDate(firstMessage.created_at, 'dd.MM.yyyy HH:mm:ss')}
                    </div>
                    <div className="whitespace-pre-wrap">
                      {firstMessage.message_text}
                    </div>
                    
                    {/* Proširivi prikaz primatelja */}
                    {group.isExpanded && (
                      <div className="mt-4 border-t pt-2">
                        <h4 className="font-medium mb-2">Primatelji:</h4>
                        <div className="space-y-1 max-h-60 overflow-y-auto">
                          {/* Prikazujemo sve članove za poruke poslane svim članovima */}
                          {isAllMembersMessage && allMembers.length > 0 ? (
                            // Prikaži listu svih članova umjesto "All Members"
                            allMembers.map((member) => (
                              <div key={`all-${member.member_id}`} className="flex justify-between items-center py-1 px-2 hover:bg-gray-50 rounded">
                                <span>{member.full_name}</span>
                                <span className={`text-sm text-red-600`}>
                                  {/* U slučaju poruka svim članovima, postavljamo inicijalni status na "Nepročitano" */}
                                  {/* Ako je član poruku pročitao, to će biti označeno u group.messages */}
                                  {group.messages.some(m => 
                                    // Provjeravamo je li član pročitao poruku
                                    m.recipient_id === member.member_id && m.status === 'read'
                                  ) ? (
                                    <span className="text-green-600">Pročitano</span>
                                  ) : (
                                    <span className="text-red-600">Nepročitano</span>
                                  )}
                                </span>
                              </div>
                            ))
                          ) : (
                            // Za grupne poruke nastavljamo koristiti postojeći prikaz
                            [...group.messages].sort((a, b) => 
                              a.sender_name.localeCompare(b.sender_name, 'hr')
                            ).map(message => (
                              <div key={message.message_id} className="flex justify-between items-center py-1 px-2 hover:bg-gray-50 rounded">
                                <span>{message.sender_name}</span>
                                <span className={`text-sm ${message.status === 'read' ? 'text-green-600' : 'text-red-600'}`}>
                                  {message.status === 'read' ? 'Pročitano' : 'Nepročitano'}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            }
          })
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