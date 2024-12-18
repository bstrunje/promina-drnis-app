import React, { useEffect, useState } from 'react';
import { useToast } from '@components/ui/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import { Button } from '@components/ui/button';

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

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Member Messages</CardTitle>
          <Button variant="outline" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </Button>
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
