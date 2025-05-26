import { useState, useEffect, useCallback } from 'react';
import { getAdminSentMessages } from '../../../utils/api/apiMessages';
import { getAllMembers } from '../../../utils/api/apiMembers';
import { useToast } from "@components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { ChevronDown, ChevronRight, Users, UserCheck } from "lucide-react";
import { formatDate } from "../../../utils/dateUtils";
import { Message, MessageGroup, MessageMember } from '../types/messageTypes';
import { convertApiMessagesToMessages } from '../utils/messageConverters';
import { parseDate, getCurrentDate } from '../../../utils/dateUtils';

interface SentMessagesProps {
  userRole: string;
}
export default function SentMessages({ userRole }: SentMessagesProps) {
  // Funkcija za prikaz liste primatelja za grupnu poruku
  const renderRecipientList = (group: MessageGroup) => {
    // allMembers je dostupno iz statea, nema potrebe za redefiniranjem ili importom
    if (group.messages[0].recipient_type === 'all') {
      // Filtriraj samo redovne članove
      // 'status' ne postoji na MessageMember, koristi se 'detailed_status' prema tipu
      const regularMembers = allMembers.filter(
        member => member.membership_type === 'regular' && member.detailed_status === 'registered'
      );

      return (
        <div className="mt-2 p-2 bg-gray-50 rounded-md max-h-40 overflow-y-auto">
          <div className="text-sm text-gray-500 mb-1">
            {regularMembers.length ?? 0} članova
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
            {regularMembers.map(member => (
              <div key={member.member_id} className="text-sm">
                {member.full_name}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Za grupne poruke, prikaži listu članova
    if (group.messages[0].recipient_type === 'group') {
      // Ovdje bismo trebali dohvatiti članove grupe
      return (
        <div className="mt-2 p-2 bg-gray-50 rounded-md">
          <div className="text-sm text-gray-500">
            Članovi grupe nisu dostupni
          </div>
        </div>
      );
    }

    return null;
  };
  const { toast } = useToast();
  // const [sentMessages, setSentMessages] = useState<Message[]>([]); // Više se ne koristi
  const [loadingSent, setLoadingSent] = useState(true);
  const [groupedMessages, setGroupedMessages] = useState<MessageGroup[]>([]);
  const [allMembers, setAllMembers] = useState<MessageMember[]>([]);

  // Funkcija za dohvaćanje poruka koje je admin poslao članovima
  const fetchSentMessages = useCallback(async (): Promise<void> => {
    // Ako je običan član, preskačemo API poziv za admin poruke
    if (userRole === 'member') {
      setLoadingSent(false);
      return;
    }

    try {
      const apiData = await getAdminSentMessages();

      // Konvertiraj API podatke u lokalni format
      const convertedData = convertApiMessagesToMessages(apiData);

      // Grupiraj poruke po recipient_type i recipient_id
      const groupedData = groupMessages(convertedData);

      // setSentMessages(convertedData); // Više se ne koristi
      setGroupedMessages(groupedData);
      setLoadingSent(false);

      // Dohvati sve članove za prikaz imena
      void fetchAllMembers();
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : 'Nije moguće dohvatiti poslane poruke',
        variant: "destructive"
      });
      setLoadingSent(false);
    }
  }, [userRole, toast]);

  // Funkcija za dohvaćanje svih članova
  const fetchAllMembers = async (): Promise<void> => {
    try {
      const members = await getAllMembers();

      // Transformiramo podatke u format koji nam treba
      const transformedMembers: MessageMember[] = members.map(member => ({
        member_id: member.member_id,
        full_name: member.full_name ?? `${member.first_name} ${member.last_name}`,
        detailed_status: member.status, // Koristimo status umjesto detailed_status
        membership_type: member.membership_type
      }));

      // Sortiraj članove po imenu
      transformedMembers.sort((a, b) => a.full_name.localeCompare(b.full_name));

      setAllMembers(transformedMembers);
    } catch (error) {
      console.error('Greška pri dohvaćanju članova:', error);
    }
  };

  // Učitaj poslane poruke pri prvom renderiranju
  useEffect(() => {
    void fetchSentMessages();
  }, [userRole, fetchSentMessages]);

  // Funkcija za grupiranje poruka
  const groupMessages = (messages: Message[]): MessageGroup[] => {
    const groups: Record<string, Message[]> = {};

    messages.forEach(message => {
      let key = '';

      if (message.recipient_type === 'all') {
        key = 'all_members';
      } else if (message.recipient_type === 'group') {
        key = `group_${message.recipient_id}`;
      } else {
        key = `member_${message.recipient_id}`;
      }

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(message);
    });

    // Sortiraj poruke unutar grupa po datumu (najnovije prvo)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const dateA = parseDate(a.created_at || '') || getCurrentDate();
        const dateB = parseDate(b.created_at || '') || getCurrentDate();
        return dateB.getTime() - dateA.getTime(); // Novije prvo
      });
    });

    // Pretvori objekt u niz grupa
    return Object.keys(groups).map(key => ({
      key,
      messages: groups[key],
      isExpanded: false
    }));
  };

  // Funkcija za promjenu stanja proširenja grupe
  const toggleGroupExpansion = (key: string) => {
    setGroupedMessages(prevGroups =>
      prevGroups.map(group =>
        group.key === key
          ? { ...group, isExpanded: !group.isExpanded }
          : group
      )
    );
  };

  // Funkcija za dobivanje naziva grupe
  const getGroupName = (group: MessageGroup): string => {
    const firstMessage = group.messages[0];

    if (firstMessage.recipient_type === 'all') {
      return 'Svi članovi';
    } else if (firstMessage.recipient_type === 'group') {
      // Ovdje bismo mogli dodati logiku za dohvaćanje naziva grupe ako postoji
      return `Grupa članova (${group.messages.length})`;
    } else {
      // Pronađi člana po ID-u
      const member = allMembers.find(m => m.member_id === firstMessage.recipient_id);
      return member ? member.full_name : `Član #${firstMessage.recipient_id}`;
    }
  };

  // Funkcija za dobivanje broja pročitanih poruka
  const getReadCount = (message: Message) => {
    // Za poruke svim članovima, prikazujemo broj pročitalo/ukupno
    if (message.recipient_type === 'all') {
      // Filtriraj samo redovne članove
      const regularMembers = allMembers.filter(
        member => member.membership_type === 'regular' && member.detailed_status === 'registered'
      );
      const total = regularMembers.length;
      // Pretpostavka: message.read_by je niz ID-eva članova koji su pročitali poruku
      // Ako backend šalje drugačije, prilagodi!
      const readCount = message.read_by?.length ?? 0;
      return `${total}/${readCount} pročitano`;
    }
    // Za ostale slučajeve možeš vratiti prazno ili neki drugi format
    return "";
  };

  return (
    <div>
      <div className="space-y-4">
        {loadingSent ? (
          <div className="text-center p-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Učitavanje poslanih poruka...</p>
          </div>
        ) : groupedMessages.length > 0 ? (
          groupedMessages.map(group => (
            <Card key={group.key} className="mb-4">
              <CardHeader className="cursor-pointer" onClick={() => toggleGroupExpansion(group.key)}>
                <CardTitle className="flex justify-between items-center">
                  <div className="flex items-center">
                    {group.messages[0].recipient_type === 'all' ? (
                      <Users className="h-5 w-5 mr-2" />
                    ) : (
                      <UserCheck className="h-5 w-5 mr-2" />
                    )}
                    <span>{getGroupName(group)}</span>
                  </div>
                  <div className="flex items-center">
                    {group.messages[0].recipient_type === 'all' && (
                      <span className="text-sm text-gray-500 mr-2">
                        {getReadCount(group.messages[0])}
                      </span>
                    )}
                    {group.isExpanded ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </div>
                </CardTitle>
              </CardHeader>

              {group.isExpanded && (
                <CardContent>
                  {/* Lista primatelja za grupnu poruku */}
                  {renderRecipientList(group)}
                  {/* Lista poruka u grupi */}
                  <div className="space-y-4 mt-4">
                    {group.messages.map(message => (
                      <div key={message.message_id} className="border-t pt-4">
                        <div className="mb-2 text-gray-500 text-sm">
                          {formatDate(message.created_at)}
                        </div>
                        <p className="whitespace-pre-wrap">{message.message_text}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        ) : (
          <div className="text-center p-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Nema poslanih poruka</p>
          </div>
        )
        }
      </div>

      <div className="mt-4">
        <Button
          variant="outline"
          onClick={() => { void fetchSentMessages(); }}
          className="w-full"
        >
          Osvježi poslane poruke
        </Button>
      </div>
    </div>
  );
}
