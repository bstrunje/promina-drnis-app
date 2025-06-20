import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@components/ui/collapsible";
import { Badge } from "@components/ui/badge";
import { Separator } from "@components/ui/separator";
import { ChevronDown, ChevronUp, Users, User, MessageSquare, Clock } from 'lucide-react';
import { formatDate } from "../../../utils/dateUtils";
import { Message as MessageType } from '../types/messageTypes';

interface SentMessageCardProps {
  message: MessageType;
  currentUserId: number | undefined;
}

export default function SentMessageCard({ message, currentUserId }: SentMessageCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const recipients = message.read_by?.filter(r => r.member_id !== String(currentUserId)) || [];
  const readCount = recipients.filter(r => r.read_at).length;

  const getMessageTitle = () => {
    if (message.recipient_type === 'all') {
      return 'Poruka svim članovima';
    } else if (message.recipient_type === 'group') {
      return 'Grupna poruka';
    } else if (recipients.length === 1) {
      return `Poruka za: ${recipients[0].full_name}`;
    }
    return 'Grupna poruka';
  };

  return (
    <Card key={message.message_id} className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center">
              {message.recipient_type === 'all' ? <Users className="mr-2 h-5 w-5" /> : <MessageSquare className="mr-2 h-5 w-5" />}
              {getMessageTitle()}
            </CardTitle>
            <CardDescription className="flex items-center text-xs text-gray-500 pt-1">
              <Clock className="mr-1 h-3 w-3" />
              Poslano: {formatDate(message.created_at, 'dd.MM.yyyy HH:mm')}
            </CardDescription>
          </div>
          <Badge variant={readCount === recipients.length ? "default" : "secondary"}>
            {readCount}/{recipients.length} pročitano
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-3">{message.message_text}</p>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-start text-sm text-blue-600 cursor-pointer">
              <span>Prikaži primatelje</span>
              {isOpen ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <Separator />
            <div className="space-y-2 pt-2">
              {recipients.map(recipient => (
                <div key={recipient.member_id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{recipient.full_name}</span>
                  </div>
                  {recipient.read_at ? (
                    <span className="text-xs text-green-600">Pročitano: {formatDate(recipient.read_at, 'dd.MM.yyyy HH:mm')}</span>
                  ) : (
                    <span className="text-xs text-gray-500">Nije pročitano</span>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
