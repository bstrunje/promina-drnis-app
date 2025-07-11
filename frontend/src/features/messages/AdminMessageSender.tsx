import React, { useState, useEffect, useCallback, useRef } from 'react';
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
      } catch (error) {
        console.error('Greška pri pretraživanju članova:', error);
        // Ne prikazujemo toast obavijest kod greške pretrage
      }
    };

    void fetchMembers();
  }, [searchTerm, toast]);

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
        title: "Upozorenje",
        description: "Molimo odaberite člana za slanje poruke",
        variant: "default"
      });
      return;
    }

    if (!messageText.trim()) {
      toast({
        title: "Upozorenje",
        description: "Poruka ne može biti prazna",
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
        title: "Uspjeh",
        description: `Poruka uspješno poslana članu ${selectedMember.full_name}`,
        variant: "success"
      });

      // Sakrij indikator uspjeha nakon 3 sekunde
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : "Slanje poruke nije uspjelo",
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
        title: "Upozorenje",
        description: "Molimo odaberite barem jednog člana za slanje grupne poruke",
        variant: "default"
      });
      return;
    }

    if (!messageText.trim()) {
      toast({
        title: "Upozorenje",
        description: "Poruka ne može biti prazna",
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
        title: "Uspjeh",
        description: `Poruka uspješno poslana grupi od ${memberIds.length} članova`,
        variant: "success"
      });

      // Sakrij indikator uspjeha nakon 3 sekunde
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : "Slanje grupne poruke nije uspjelo",
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
        title: "Upozorenje",
        description: "Poruka ne može biti prazna",
        variant: "default"
      });
      return;
    }

    if (!window.confirm('Jeste li sigurni da želite poslati poruku SVIM članovima?')) {
      return;
    }

    setIsSending(true);
    try {
      await sendAdminMessageToAll(messageText);
      setMessageText('');
      setShowSuccess(true);

      toast({
        title: "Uspjeh",
        description: `Poruka uspješno poslana svim članovima`,
        variant: "success"
      });

      // Sakrij indikator uspjeha nakon 3 sekunde
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : "Slanje poruke svim članovima nije uspjelo",
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
          Slanje poruka članovima
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={messageTab} onValueChange={setMessageTab} className="mb-6">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="single" className="flex items-center">
              <UserCheck className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Pojedinačnom članu</span>
            </TabsTrigger>
            <TabsTrigger value="group" className="flex items-center">
              <Users className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Grupi članova</span>
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center">
              <Mail className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Svim članovima</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4">
                        <div className="space-y-2">
              <label htmlFor="member-search" className="text-sm font-medium">
                Primatelj:
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
                    placeholder="Pretraži po imenu ili prezimenu... (najmanje 2 znaka)"
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
                      Unesite najmanje 2 znaka za pretragu članova
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="message-text-single" className="text-sm font-medium">
                Tekst poruke:
              </label>
              <textarea
                id="message-text-single"
                className="w-full p-2 border rounded-md h-32"
                placeholder="Unesite tekst poruke..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />

              <Button
                onClick={() => { void handleSendToSingle(); }}
                disabled={isSending || !selectedMember || !messageText.trim()}
                className="w-full"
              >
                {isSending ? 'Slanje...' : 'Pošalji poruku'}
                <CornerDownLeft className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="group" className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="group-member-search" className="text-sm font-medium">
                Dodaj člana u grupu:
              </label>
              <Input
                id="group-member-search"
                placeholder="Pretraži po imenu ili prezimenu... (najmanje 2 znaka)"
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
                  Unesite najmanje 2 znaka za pretragu članova
                </div>
              )}
            </div>

            {selectedMembers.length > 0 && (
              <div className="p-2 border rounded-md bg-slate-50 mt-4">
                <div className="flex justify-between items-center">
                  <p className="font-medium">Odabrani članovi ({selectedMembers.length}):</p>
                  <button
                    className="text-xs text-red-500"
                    onClick={() => setSelectedMembers([])}
                  >
                    Obriši sve
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
                Tekst poruke za grupu:
              </label>
              <textarea
                id="message-text-group"
                className="w-full p-2 border rounded-md h-32"
                placeholder="Unesite tekst poruke za grupu članova..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />

              <Button
                onClick={() => { void handleSendToGroup(); }}
                disabled={isSending || selectedMembers.length === 0 || !messageText.trim()}
                className="w-full"
              >
                {isSending ? 'Slanje...' : `Pošalji poruku (${selectedMembers.length} članova)`}
                <Users className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 mb-4">
              <p className="font-medium">Važno upozorenje</p>
              <p className="text-sm">
                Ova poruka će biti poslana SVIM članovima u sustavu. Koristite ovu opciju samo
                kada je poruka namijenjena svim članovima, poput važnih obavijesti, događaja, itd.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="message-text-all" className="text-sm font-medium">
                Tekst poruke za sve članove:
              </label>
              <textarea
                id="message-text-all"
                className="w-full p-2 border rounded-md h-32"
                placeholder="Unesite tekst poruke za sve članove..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />

              <Button
                onClick={() => { void handleSendToAll(); }}
                disabled={isSending || !messageText.trim()}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                {isSending ? 'Slanje...' : 'Pošalji svim članovima'}
                <Mail className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {showSuccess && (
          <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-md text-green-800 animate-pulse">
            Poruka uspješno poslana!
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminMessageSender;
