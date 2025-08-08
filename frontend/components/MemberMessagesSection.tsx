import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { useToast } from '@components/ui/use-toast';
import { Member } from '@shared/member';
import { sendMemberMessage } from '../src/utils/api';
import { useAuth } from '../src/context/useAuth';
import { MessageSquare } from 'lucide-react';

interface MemberMessagesSectionProps {
  member: Member;
}

const MemberMessagesSection: React.FC<MemberMessagesSectionProps> = ({ member }) => {
  const { t } = useTranslation('profile');
  const [comment, setComment] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Provjera je li ovo profil trenutnog korisnika
  const isOwnProfile = user?.member_id === member.member_id;

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendMemberMessage(member.member_id, comment);
      setComment('');
      toast({
        title: t('common.success'),
        description: t('messages.sendSuccess'),
        variant: "success"
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('messages.sendError'),
        variant: "destructive"
      });
    }
  };

  // Ako nije vlastiti profil, ne prikazujemo komponentu za slanje poruka
  if (!isOwnProfile) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            {t('messages.title')}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={e => { void handleCommentSubmit(e); }}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full p-2 border rounded-md mb-4"
            rows={4}
            placeholder={t('messages.placeholder')}
          />
          <Button type="submit" className="px-4 py-2 bg-black text-white rounded hover:bg-blue-700">
            {t('messages.sendButton')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default MemberMessagesSection;