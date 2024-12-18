import React, { useEffect, useState } from 'react';
import { useToast } from '@components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { useAuth } from '../../context/AuthContext'; // Correct the import statement

interface Message {
  message_id: number;
  memberName: string;
  messageText: string;
  createdAt: string;
  sender_name: string;
  status: 'unread' | 'read' | 'archived';
}

const MessageList: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth(); // Add this line to get the user context

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/messages/admin', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      console.log('Fetched messages:', data); // Add logging
      setMessages(data.map((message: any) => ({
        ...message,
        createdAt: new Date(message.created_at).toISOString(), // Map created_at to createdAt and ensure it is an ISO string
        memberName: message.sender_name, // Ensure memberName is correctly populated
        messageText: message.message_text, // Ensure messageText is correctly populated
        status: message.status // Ensure status is correctly populated
      })));
    } catch (error) {
      console.error('Error fetching messages:', error); // Add logging
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to fetch messages',
        variant: "destructive"
      });
    }
  };

  const markMessageAsRead = async (messageId: number) => {
    try {
      const response = await fetch(`http://localhost:3000/api/messages/${messageId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to mark message as read');
      fetchMessages(); // Refresh messages after marking as read
    } catch (error) {
      console.error('Error marking message as read:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to mark message as read',
        variant: "destructive"
      });
    }
  };

  const archiveMessage = async (messageId: number) => {
    try {
      const response = await fetch(`http://localhost:3000/api/messages/${messageId}/archive`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to archive message');
      fetchMessages(); // Refresh messages after archiving
    } catch (error) {
      console.error('Error archiving message:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to archive message',
        variant: "destructive"
      });
    }
  };

  const deleteMessage = async (messageId: number) => {
    try {
      const response = await fetch(`http://localhost:3000/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        if (response.status === 404) {
          setMessages(prevMessages => prevMessages.filter(message => message.message_id !== messageId)); // Remove the message from the state
          return;
        } else {
          throw new Error('Failed to delete message');
        }
      }
      setMessages(prevMessages => prevMessages.filter(message => message.message_id !== messageId)); // Remove the message from the state
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete message',
        variant: "destructive"
      });
    }
  };

  const deleteAllMessages = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/messages', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to delete all messages');
      fetchMessages(); // Refresh messages after deletion
    } catch (error) {
      console.error('Error deleting all messages:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete all messages',
        variant: "destructive"
      });
    }
  };

  const confirmDelete = async (messageId?: number) => {
    if (window.confirm('Are you sure you want to delete the message(s)?')) {
      if (messageId) {
        await deleteMessage(messageId);
      } else {
        await deleteAllMessages();
      }
    }
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Member Messages</CardTitle>
          <Button variant="outline" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </Button>
          {user?.role === 'superuser' && (
            <div className="flex gap-2 mb-4">
              <Button variant="outline" onClick={() => confirmDelete()}>Delete All Messages</Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p>No messages at this time.</p>
          ) : (
            <ul>
              {messages
                .filter(message => showArchived ? message.status === 'archived' : message.status !== 'archived')
                .map((message, index) => (
                  <li key={index} className={`mb-4 p-2 border-b ${message.status === 'read' ? 'bg-gray-100' : ''}`}>
                    <p><strong>From:</strong> {message.memberName}</p>
                    <p><strong>Message:</strong> {message.messageText}</p>
                    <p><strong>Sent:</strong> {new Date(message.createdAt).toLocaleString()}</p> {/* Correctly parse and display the date */}
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        checked={message.status === 'read'}
                        onChange={() => markMessageAsRead(message.message_id)}
                      />
                      <label>Mark as Read</label>
                      <Button variant="outline" onClick={() => archiveMessage(message.message_id)}>
                        Archive
                      </Button>
                      {user?.role === 'superuser' && (
                        <Button variant="outline" onClick={() => confirmDelete(message.message_id)}>Delete</Button>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MessageList;
