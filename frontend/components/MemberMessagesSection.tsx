import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { useToast } from '@components/ui/use-toast';
import { Member } from '@shared/types/member';
import { sendMemberMessage } from '../src/utils/api';

interface MemberMessagesSectionProps {
  member: Member;
}

const MemberMessagesSection: React.FC<MemberMessagesSectionProps> = ({ member }) => {
  const [comment, setComment] = useState('');
  const { toast } = useToast();

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendMemberMessage(member.member_id, comment);
      setComment('');
      toast({
        title: "Success",
        description: "Message sent successfully",
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Message to Admin</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCommentSubmit}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full p-2 border rounded-md mb-4"
            rows={4}
            placeholder="Type your message here..."
          />
          <Button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Send Message
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default MemberMessagesSection;