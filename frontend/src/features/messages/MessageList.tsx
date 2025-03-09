import { useState, useEffect } from 'react';
import { getAdminMessages } from '../../utils/api';
import { useToast } from "@components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { Bell, CheckCircle, Archive, Trash2, Inbox } from "lucide-react";

interface Message {
  message_id: number;
  member_id: number;
  sender_name: string;
  message_text: string;
  created_at: string;
  status: 'unread' | 'read' | 'archived';
}

export default function MessageList() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'unread' | 'read' | 'archived'>('unread');

  const fetchMessages = async () => {
    try {
      const data = await getAdminMessages();
      setMessages(data);
      setLoading(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to fetch messages',
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const onMarkAsRead = async (messageId: number) => {
    try {
      await fetch(`/api/messages/${messageId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      await fetchMessages();
      toast({
        title: "Success",
        description: "Message marked as read",
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark message as read",
        variant: "destructive"
      });
    }
  };

  const onArchive = async (messageId: number) => {
    try {
      await fetch(`/api/messages/${messageId}/archive`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      await fetchMessages();
      toast({
        title: "Success",
        description: "Message archived",
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to archive message",
        variant: "destructive"
      });
    }
  };

  const onDelete = async (messageId: number) => {
    try {
      await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setMessages(prevMessages => prevMessages.filter(m => m.message_id !== messageId));
      toast({
        title: "Success",
        description: "Message deleted",
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive"
      });
    }
  };

  const onDeleteAll = async () => {
    try {
      await fetch('/api/messages', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setMessages([]);
      toast({
        title: "Success",
        description: "All messages deleted",
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete all messages",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  const filteredMessages = messages.filter(message => {
    return message.status === filter;
  });

  const unreadCount = messages.filter(m => m.status === 'unread').length;
  const archivedCount = messages.filter(m => m.status === 'archived').length;
  const readCount = messages.filter(m => m.status === 'read').length;

  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg text-white p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">Messages</h1>
            <p className="opacity-90">Member Communications</p>
          </div>
          <div className="flex items-center space-x-2">
            <Bell className="h-6 w-6" />
            <span className="text-lg font-bold">{unreadCount} unread</span>
          </div>
        </div>
      </div>

      <div className="mb-4 border-b pb-2">
        <div className="flex space-x-2">
          <Button 
            variant={filter === 'unread' ? "default" : "outline"}
            onClick={() => setFilter('unread')}
            size="sm"
            className="flex items-center space-x-1"
          >
            <Bell className="h-4 w-4" />
            <span>Unread ({unreadCount})</span>
          </Button>
          <Button 
            variant={filter === 'read' ? "default" : "outline"}
            onClick={() => setFilter('read')}
            size="sm"
            className="flex items-center space-x-1"
          >
            <Inbox className="h-4 w-4" />
            <span>Read ({readCount})</span>
          </Button>
          <Button 
            variant={filter === 'archived' ? "default" : "outline"}
            onClick={() => setFilter('archived')}
            size="sm"
            className="flex items-center space-x-1"
          >
            <Archive className="h-4 w-4" />
            <span>Archived ({archivedCount})</span>
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
                <span>Delete All Messages</span>
              </Button>
            </div>

            {filteredMessages.map((message) => (
              <Card key={message.message_id} className={message.status === 'unread' ? 'border-blue-500' : ''}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>{message.sender_name}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(message.created_at).toLocaleString()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">{message.message_text}</p>
                  <div className="flex justify-end space-x-2">
                    {message.status === 'unread' && (
                      <Button
                        variant="outline"
                        onClick={() => onMarkAsRead(message.message_id)}
                        className="flex items-center space-x-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">Mark as Read</span>
                      </Button>
                    )}
                    {message.status !== 'archived' && (
                      <Button
                        variant="outline"
                        onClick={() => onArchive(message.message_id)}
                        className="flex items-center space-x-2"
                      >
                        <Archive className="h-4 w-4" />
                        <span className="hidden sm:inline">Archive</span>
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      onClick={() => onDelete(message.message_id)}
                      className="flex items-center space-x-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <div className="text-center py-10 bg-gray-50 rounded-lg">
            {filter === 'unread' ? (
              <>
                <Bell className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <p className="text-gray-500">No unread messages</p>
              </>
            ) : filter === 'archived' ? (
              <>
                <Archive className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <p className="text-gray-500">No archived messages</p>
              </>
            ) : (
              <>
                <Inbox className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <p className="text-gray-500">No read messages</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}