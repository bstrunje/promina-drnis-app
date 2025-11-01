import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@components/ui/command';
import { getActiveMembers, getAllMembers } from '@/utils/api/apiMembers';
import { Member } from '@shared/member';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@components/ui/select';
import { Button } from '@components/ui/button';
import { ParticipantRole, MemberWithRole, isExclusiveRole } from './memberRole';
import { useSystemSettings } from '@/hooks/useSystemSettings';

// Uloge se sada lokaliziraju putem i18next

interface MemberRoleSelectProps {
  selectedMembers: MemberWithRole[];
  onSelectionChange: (selectedMembers: MemberWithRole[]) => void;
}

export const MemberRoleSelect: React.FC<MemberRoleSelectProps> = ({ selectedMembers, onSelectionChange }) => {
  const { t } = useTranslation('activities');
  const [isFocused, setIsFocused] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedRole, setSelectedRole] = useState<ParticipantRole>(ParticipantRole.REGULAR);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { systemSettings } = useSystemSettings();

  // Mapiranje enum vrijednosti na ključeve prijevoda u activities.roles
  // Napomena: koristimo camelCase ključeve u prijevodima (npr. assistantGuide)
  const roleKeyMap: Record<ParticipantRole, string> = {
    [ParticipantRole.GUIDE]: 'guide',
    [ParticipantRole.ASSISTANT_GUIDE]: 'assistantGuide',
    [ParticipantRole.DRIVER]: 'driver',
    [ParticipantRole.REGULAR]: 'regular',
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [wrapperRef]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const allowFormer = Boolean(systemSettings?.allowFormerMembersInSelectors);
        const list = allowFormer ? await getAllMembers() : await getActiveMembers();
        setMembers(list);
      } catch (error) {
        console.error('Failed to fetch active members:', error);
      }
    };
    void fetchMembers();
  }, [systemSettings?.allowFormerMembersInSelectors]);

  // Dodaje novog sudionika s odabranom ulogom
  const handleSelect = (memberId: number) => {
    // Provjeri je li član već dodan
    const existingMember = selectedMembers.find(m => m.memberId === memberId.toString());
    
    if (existingMember) {
      // Ako je već dodan, ukloni ga
      const newSelection = selectedMembers.filter(m => m.memberId !== memberId.toString());
      onSelectionChange(newSelection);
    } else {
      // Provjeri da li je odabrana uloga ekskluzivna i već zauzeta
      if (isExclusiveRole(selectedRole)) {
        const existingMemberWithRole = selectedMembers.find(m => m.role === selectedRole);
        if (existingMemberWithRole) {
          // Zamijeni uloge - postojeći član s ekskluzivnom ulogom postaje REGULAR
          const updatedMembers = selectedMembers.map(member => 
            member.memberId === existingMemberWithRole.memberId 
              ? { ...member, role: ParticipantRole.REGULAR }
              : member
          );
          const newMember: MemberWithRole = {
            memberId: memberId.toString(),
            role: selectedRole
          };
          onSelectionChange([...updatedMembers, newMember]);
        } else {
          // Ekskluzivna uloga nije zauzeta, dodaj normalno
          const newMember: MemberWithRole = {
            memberId: memberId.toString(),
            role: selectedRole
          };
          onSelectionChange([...selectedMembers, newMember]);
        }
      } else {
        // Nije ekskluzivna uloga, dodaj normalno
        const newMember: MemberWithRole = {
          memberId: memberId.toString(),
          role: selectedRole
        };
        onSelectionChange([...selectedMembers, newMember]);
      }
    }
    setInputValue('');
    inputRef.current?.focus();
  };

  // Promjena uloge za postojećeg sudionika
  const handleRoleChange = (memberId: string, newRole: ParticipantRole) => {
    // Validacija za IZLETE - mora postojati vodič
    if (newRole !== ParticipantRole.GUIDE) {
      const hasGuide = selectedMembers.some(m => m.role === ParticipantRole.GUIDE && m.memberId !== memberId);
      if (!hasGuide) {
        // Ako nema vodiča i pokušavamo postaviti nekoga na ne-vodič ulogu, odbaci promjenu
        alert('Izlet mora imati vodiča. Molimo prvo dodijelite ulogu vodiča nekom članu.');
        return;
      }
    }

    // Provjeri da li je nova uloga ekskluzivna i da li je već zauzeta
    if (isExclusiveRole(newRole)) {
      const existingMemberWithRole = selectedMembers.find(m => m.role === newRole && m.memberId !== memberId);
      if (existingMemberWithRole) {
        // Zamijeni uloge - postojeći član s ekskluzivnom ulogom postaje REGULAR
        const updatedMembers = selectedMembers.map(member => {
          if (member.memberId === memberId) {
            return { ...member, role: newRole };
          } else if (member.memberId === existingMemberWithRole.memberId) {
            return { ...member, role: ParticipantRole.REGULAR };
          }
          return member;
        });
        onSelectionChange(updatedMembers);
        return;
      }
    }

    // Standardna promjena uloge
    const updatedMembers = selectedMembers.map(member => 
      member.memberId === memberId 
        ? { ...member, role: newRole } 
        : member
    );
    onSelectionChange(updatedMembers);
  };

  // Uklanjanje sudionika
  const handleRemoveMember = (memberId: string) => {
    const updatedMembers = selectedMembers.filter(m => m.memberId !== memberId);
    
    // Ako uklanjamo vozača, trebamo ažurirati postotke ostalih vozača
    const removedMember = selectedMembers.find(m => m.memberId === memberId);
    if (removedMember?.role === ParticipantRole.DRIVER) {
      const remainingDrivers = updatedMembers.filter(m => m.role === ParticipantRole.DRIVER);
      if (remainingDrivers.length > 0) {
        // Ažuriraj postotke za preostale vozače
        const updatedMembersWithNewPercentages = updatedMembers.map(member => {
          if (member.role === ParticipantRole.DRIVER && !member.manualRecognition) {
            return { ...member }; // calculateRecognitionPercentage će se pozivati u parent komponenti
          }
          return member;
        });
        onSelectionChange(updatedMembersWithNewPercentages);
        return;
      }
    }
    
    onSelectionChange(updatedMembers);
  };

  const selectedMemberIds = selectedMembers.map(m => m.memberId);
  
  const filteredMembers = inputValue
    ? members.filter(m => 
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(inputValue.toLowerCase()) &&
        !selectedMemberIds.includes(m.member_id.toString())
      )
    : [];

  return (
    <div className="space-y-3" ref={wrapperRef}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Command>
            <CommandInput 
              ref={inputRef}
              placeholder={t('participants.searchPlaceholder')}
              value={inputValue}
              onValueChange={setInputValue}
              onFocus={() => setIsFocused(true)}
              className="border-2 border-input ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {isFocused && (
              <div className="absolute top-full mt-1 w-full rounded-md border bg-popover p-0 text-popover-foreground shadow-md z-[100]">
                <CommandList>
                  {inputValue && filteredMembers.length === 0 && (
                    <CommandEmpty>{t('common:noResults')}</CommandEmpty>
                  )}
                  {filteredMembers.map((member) => (
                    <CommandItem
                      key={member.member_id}
                      value={`${member.first_name} ${member.last_name} ${member.member_id}`}
                      onSelect={() => handleSelect(member.member_id)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedMemberIds.includes(member.member_id.toString()) ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {member.first_name} {member.last_name}
                    </CommandItem>
                  ))}
                </CommandList>
              </div>
            )}
          </Command>
        </div>

        <div className="w-36">
          <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as ParticipantRole)}>
            <SelectTrigger>
              <SelectValue placeholder={t('participants.role')} />
            </SelectTrigger>
            <SelectContent>
              {Object.values(ParticipantRole).map((role) => (
                <SelectItem key={role} value={role}>
                  {t(`roles.${roleKeyMap[role]}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        {selectedMembers.length > 0 && (
          <div className="text-sm text-muted-foreground mb-1">{t('participants.selectedParticipants')}:</div>
        )}
        
        {selectedMembers.length > 0 && (
          <div className="flex flex-col gap-2">
            {selectedMembers.map((memberWithRole) => {
              const member = members.find(m => m.member_id.toString() === memberWithRole.memberId);
              
              return member ? (
                <div key={member.member_id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-secondary/50">
                  <span>
                    {member.first_name} {member.last_name}
                  </span>
                  <div className="flex items-center gap-2">
                    <Select 
                      value={memberWithRole.role}
                      onValueChange={(value) => handleRoleChange(member.member_id.toString(), value as ParticipantRole)}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder={t('participants.role')} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ParticipantRole).map((role) => (
                          <SelectItem key={role} value={role}>
                            {t(`roles.${roleKeyMap[role]}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(member.member_id.toString())}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null;
            })}
          </div>
        )}
        
        {selectedMembers.length === 0 && (
          <div className="text-sm text-muted-foreground">{t('participants.addFromList')}</div>
        )}
      </div>
    </div>
  );
};

export default MemberRoleSelect;
