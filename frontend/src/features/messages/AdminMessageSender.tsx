import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { searchMembers } from '../../utils/api/apiAuth';
// Zamijenjeno prema novoj modularnoj API strukturi
import {
  sendAdminMessageToMember,
  sendAdminMessageToGroup,
  sendAdminMessageToAll
} from '../../utils/api/apiMessages';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@components/ui/tabs';
// Import iz @components/ui/select nije potreban
import { useToast } from '@components/ui/use-toast';
import { Checkbox } from '@components/ui/checkbox';
import { CornerDownLeft, Send, Users, UserCheck, Mail, X } from 'lucide-react';
import { MemberSearchResult } from '@shared/member';

const AdminMessageSender: React.FC = () => {
  const { t } = useTranslation('messages');
  // Ref za automatski fokus na input za pretragu članova
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [messageTab, setMessageTab] = useState('single');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<MemberSearchResult[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<MemberSearchResult[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Pretražujemo članove kad se promijeni searchTerm
  useEffect(() => {
    const fetchMembers = async () => {
      // Promijenjena logika - ne pokušavamo dohvaćati podatke dok se ne upiše najmanje 2 znaka
      if (searchTerm.length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        const members = await searchMembers(searchTerm);

        // Transformiramo Member[] u MemberSearchResult[]
        const transformedResults: MemberSearchResult[] = members.map(member => ({
          member_id: member.member_id,
          full_name: member.full_name ?? `${member.first_name} ${member.last_name}`,
          oib: member.oib,
          nickname: member.nickname
        }));

        setSearchResults(transformedResults);
      } catch {
        // Namjerna tiha degradacija: bez console logova radi ESLint pravila
        // Ne prikazujemo toast obavijest kod greške pretrage
      }
    };

    void fetchMembers();
  }, [searchTerm]);

  // Funkcija za slanje poruke pojedinačnom članu
  const handleSelectMember = (member: MemberSearchResult) => {
    setSelectedMember(member);
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleCancelSelection = () => {
    setSelectedMember(null);
  };

  // Funkcija za slanje poruke pojedinačnom članu
  const handleSendToSingle = async () => {
    if (!selectedMember) {
      toast({
        title: t('common.warning'),
        description: t('adminMessageSender.messages.selectMemberWarning'),
        variant: "default"
      });
      return;
    }

    if (!messageText.trim()) {
      toast({
        title: t('common.warning'),
        description: t('adminMessageSender.messages.emptyMessageWarning'),
        variant: "default"
      });
      return;
    }

    setIsSending(true);
    try {
      await sendAdminMessageToMember(selectedMember.member_id, messageText);
      setMessageText('');
      setSelectedMember(null);
      setSearchTerm('');
      setSearchResults([]);
      setShowSuccess(true);

      toast({
        title: t('common.success'),
        description: t('adminMessageSender.messages.singleSuccess', { memberName: selectedMember.full_name }),
        variant: "success"
      });

      // Sakrij indikator uspjeha nakon 3 sekunde
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('adminMessageSender.messages.singleError'),
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  // Funkcija za dodavanje ili uklanjanje člana iz grupe za slanje
  const toggleMemberInGroup = (member: MemberSearchResult) => {
    setSelectedMembers(prevSelected => {
      const alreadySelected = prevSelected.some(m => m.member_id === member.member_id);

      if (alreadySelected) {
        return prevSelected.filter(m => m.member_id !== member.member_id);
      } else {
        return [...prevSelected, member];
      }
    });
  };

  // Funkcija za slanje poruke grupi članova
  const handleSendToGroup = async () => {
    if (selectedMembers.length === 0) {
      toast({
        title: t('common.warning'),
        description: t('adminMessageSender.messages.selectGroupWarning'),
        variant: "default"
      });
      return;
    }

    if (!messageText.trim()) {
      toast({
        title: t('common.warning'),
        description: t('adminMessageSender.messages.emptyMessageWarning'),
        variant: "default"
      });
      return;
    }

    setIsSending(true);
    try {
      const memberIds = selectedMembers.map(m => m.member_id);
      await sendAdminMessageToGroup(memberIds, messageText);
      setMessageText('');
      setSelectedMembers([]);
      setSearchTerm('');
      setSearchResults([]);
      setShowSuccess(true);

      toast({
        title: t('common.success'),
        description: t('adminMessageSender.messages.groupSuccess', { count: memberIds.length }),
        variant: "success"
      });

      // Sakrij indikator uspjeha nakon 3 sekunde
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('adminMessageSender.messages.groupError'),
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  // Funkcija za slanje poruke svim članovima
  const handleSendToAll = async () => {
    if (!messageText.trim()) {
      toast({
        title: t('common.warning'),
        description: t('adminMessageSender.messages.emptyMessageWarning'),
        variant: "default"
      });
      return;
    }

    if (!window.confirm(t('adminMessageSender.confirmDialogs.sendToAll'))) {
      return;
    }

    setIsSending(true);
    try {
      await sendAdminMessageToAll(messageText);
      setMessageText('');
      setShowSuccess(true);

      toast({
        title: t('common.success'),
        description: t('adminMessageSender.messages.allSuccess'),
        variant: "success"
      });

      // Sakrij indikator uspjeha nakon 3 sekunde
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('adminMessageSender.messages.allError'),
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Send className="mr-2 h-6 w-6 text-blue-600" />
          {t('adminMessageSender.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={messageTab} onValueChange={setMessageTab} className="mb-6">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="single" className="flex items-center">
              <UserCheck className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t('adminMessageSender.tabs.single')}</span>
            </TabsTrigger>
            <TabsTrigger value="group" className="flex items-center">
              <Users className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t('adminMessageSender.tabs.group')}</span>
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center">
              <Mail className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t('adminMessageSender.tabs.all')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="member-search" className="text-sm font-medium">
                {t('adminMessageSender.labels.recipient')}
              </label>
              {selectedMember ? (
                <div className="flex items-center justify-between p-2 border rounded-md bg-blue-100 text-blue-800">
                  <span className="font-medium">{selectedMember.full_name}</span>
                  <Button variant="ghost" size="sm" onClick={handleCancelSelection} className="text-blue-800 hover:bg-blue-200 hover:text-blue-900">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <Input
                    id="member-search"
                    placeholder={t('adminMessageSender.placeholders.searchMember')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchResults.length > 0 && (
                    <div className="border rounded-md p-2 max-h-60 overflow-y-auto mt-2">
                      {searchResults.map((member) => (
                        <div
                          key={member.member_id}
                          className="flex items-center p-2 hover:bg-slate-100 cursor-pointer rounded-md"
                          onClick={() => handleSelectMember(member)}
                        >
                          <div className="font-medium">
                            {member.full_name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchTerm.length > 0 && searchTerm.length < 2 && (
                    <div className="text-sm text-gray-500 mt-1">
                      {t('adminMessageSender.messages.searchMinLength')}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="message-text-single" className="text-sm font-medium">
                {t('adminMessageSender.labels.messageText')}
              </label>
              <textarea
                id="message-text-single"
                className="w-full p-2 border rounded-md h-32"
                placeholder={t('adminMessageSender.placeholders.messageText')}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />

              <Button
                onClick={() => { void handleSendToSingle(); }}
                disabled={isSending || !selectedMember || !messageText.trim()}
                className="w-full"
              >
                {isSending ? t('adminMessageSender.buttons.sending') : t('adminMessageSender.buttons.sendMessage')}
                <CornerDownLeft className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="group" className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="group-member-search" className="text-sm font-medium">
                {t('messages.addMemberToGroup')}
              </label>
              <Input
                id="group-member-search"
                placeholder={t('messages.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                ref={searchInputRef}
              />

              {searchResults.length > 0 && (
                <div className="border rounded-md p-2 max-h-60 overflow-y-auto mt-2">
                  {searchResults.map((member) => (
                    <div
                      key={member.member_id}
                      className="flex items-center p-2 hover:bg-slate-50 cursor-pointer rounded-md"
                      onClick={() => {
                        toggleMemberInGroup(member);
                        setSearchTerm('');
                        setTimeout(() => searchInputRef.current?.focus(), 0);
                      }}
                    >
                      <Checkbox
                        id={`member-${member.member_id}`}
                        checked={selectedMembers.some(m => m.member_id === member.member_id)}
                      />
                      <div className="ml-2 w-full">
                        <div className="font-medium">
                          {member.full_name}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchTerm.length > 0 && searchTerm.length < 2 && (
                <div className="text-sm text-gray-500 mt-1">
                  {t('adminMessageSender.messages.searchMinLength')}
                </div>
              )}
            </div>

            {selectedMembers.length > 0 && (
              <div className="p-2 border rounded-md bg-slate-50 mt-4">
                <div className="flex justify-between items-center">
                  <p className="font-medium">{t('adminMessageSender.labels.selectedMembers', { count: selectedMembers.length })}</p>
                  <button
                    className="text-xs text-red-500"
                    onClick={() => setSelectedMembers([])}
                  >
                    {t('adminMessageSender.buttons.clearAll')}
                  </button>
                </div>
                <div className="max-h-32 overflow-y-auto mt-1">
                  {selectedMembers.map((member) => (
                    <div key={member.member_id} className="flex justify-between text-sm py-1 items-center hover:bg-gray-100 rounded px-1">
                      <span>
                        {member.full_name}
                      </span>
                      <button
                        className="text-red-500"
                        onClick={() => toggleMemberInGroup(member)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="message-text-group" className="text-sm font-medium">
                {t('adminMessageSender.labels.messageTextGroup')}
              </label>
              <textarea
                id="message-text-group"
                className="w-full p-2 border rounded-md h-32"
                placeholder={t('adminMessageSender.placeholders.messageTextGroup')}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />

              <Button
                onClick={() => { void handleSendToGroup(); }}
                disabled={isSending || selectedMembers.length === 0 || !messageText.trim()}
                className="w-full"
              >
                {isSending ? t('adminMessageSender.buttons.sending') : t('adminMessageSender.buttons.sendToGroup', { count: selectedMembers.length })}
                <Users className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 mb-4">
              <p className="font-medium">{t('adminMessageSender.warnings.importantNotice')}</p>
              <p className="text-sm">
                {t('adminMessageSender.warnings.sendToAllDescription')}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="message-text-all" className="text-sm font-medium">
                {t('adminMessageSender.labels.messageTextAll')}
              </label>
              <textarea
                id="message-text-all"
                className="w-full p-2 border rounded-md h-32"
                placeholder={t('adminMessageSender.placeholders.messageTextAll')}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />

              <Button
                onClick={() => { void handleSendToAll(); }}
                disabled={isSending || !messageText.trim()}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                {isSending ? t('adminMessageSender.buttons.sending') : t('adminMessageSender.buttons.sendToAll')}
                <Mail className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {showSuccess && (
          <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-md text-green-800 animate-pulse">
            {t('adminMessageSender.success.messageSent')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminMessageSender;
