import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@components/ui/command';
import { Badge } from '@components/ui/badge';
import { getActiveMembers } from '@/utils/api/apiMembers';
import { Member } from '@shared/member';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@components/ui/select';
import { Button } from '@components/ui/button';

// Uloge sudionika za izlete
export enum ParticipantRole {
  GUIDE = 'GUIDE',
  ASSISTANT_GUIDE = 'ASSISTANT_GUIDE',
  DRIVER = 'DRIVER',
  REGULAR = 'REGULAR'
}

// Uloge se sada lokaliziraju putem i18next

// Mapiranje uloga na postotke priznavanja
export const rolesToRecognitionPercentage: Record<ParticipantRole, number> = {
  [ParticipantRole.GUIDE]: 100,
  [ParticipantRole.ASSISTANT_GUIDE]: 50,
  [ParticipantRole.DRIVER]: 100,
  [ParticipantRole.REGULAR]: 10,
};

// Tip za sudionika s ulogom
export interface MemberWithRole {
  memberId: string;
  role: ParticipantRole;
  manualRecognition?: number | null;
}

interface MemberRoleSelectProps {
  selectedMembers: MemberWithRole[];
  onSelectionChange: (selectedMembers: MemberWithRole[]) => void;
}

export const MemberRoleSelect: React.FC<MemberRoleSelectProps> = ({ selectedMembers, onSelectionChange }) => {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedRole, setSelectedRole] = useState<ParticipantRole>(ParticipantRole.REGULAR);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
        const activeMembers = await getActiveMembers();
        setMembers(activeMembers);
      } catch (error) {
        console.error('Failed to fetch active members:', error);
      }
    };

    fetchMembers();
  }, []);

  // Dodaje novog sudionika s odabranom ulogom
  const handleSelect = (memberId: number) => {
    // Provjeri je li član već dodan
    const existingMember = selectedMembers.find(m => m.memberId === memberId.toString());
    
    if (existingMember) {
      // Ako je već dodan, ukloni ga
      const newSelection = selectedMembers.filter(m => m.memberId !== memberId.toString());
      onSelectionChange(newSelection);
    } else {
      // Ako nije dodan, dodaj ga s odabranom ulogom
      const newMember: MemberWithRole = {
        memberId: memberId.toString(),
        role: selectedRole
      };
      onSelectionChange([...selectedMembers, newMember]);
    }
    setInputValue('');
    inputRef.current?.focus();
  };

  // Promjena uloge za postojećeg sudionika
  const handleRoleChange = (memberId: string, newRole: ParticipantRole) => {
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
              placeholder={t('activities.participants.searchPlaceholder')}
              value={inputValue}
              onValueChange={setInputValue}
              onFocus={() => setIsFocused(true)}
              className="border-2 border-input ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {isFocused && (
              <div className="absolute top-full mt-1 w-full rounded-md border bg-popover p-0 text-popover-foreground shadow-md z-[100]">
                <CommandList>
                  {inputValue && filteredMembers.length === 0 && (
                    <CommandEmpty>{t('common.noResults')}</CommandEmpty>
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
              <SelectValue placeholder={t('activities.participants.role')} />
            </SelectTrigger>
            <SelectContent>
              {Object.values(ParticipantRole).map((role) => (
                <SelectItem key={role} value={role}>
                  {t(`activities.roles.${role.toLowerCase()}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        {selectedMembers.length > 0 && (
          <div className="text-sm text-muted-foreground mb-1">{t('activities.participants.selectedParticipants')}:</div>
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
                        <SelectValue placeholder={t('activities.participants.role')} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ParticipantRole).map((role) => (
                          <SelectItem key={role} value={role}>
                            {t(`activities.roles.${role.toLowerCase()}`)}
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
          <div className="text-sm text-muted-foreground">{t('activities.participants.addFromList')}</div>
        )}
      </div>
    </div>
  );
};

export default MemberRoleSelect;
