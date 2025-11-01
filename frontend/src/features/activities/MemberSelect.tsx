import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@components/ui/command';
import { Badge } from '@components/ui/badge';
import { getActiveMembers, getAllMembers } from '@/utils/api/apiMembers';
import { Member } from '@shared/member';
import { useSystemSettings } from '@/hooks/useSystemSettings';

interface MemberSelectProps {
  selectedMemberIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

export const MemberSelect: React.FC<MemberSelectProps> = ({ selectedMemberIds, onSelectionChange }) => {
  const { t } = useTranslation(['activities', 'common']);
  const [isFocused, setIsFocused] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [inputValue, setInputValue] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { systemSettings } = useSystemSettings();

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

  const handleSelect = (memberId: number) => {
    const newSelection = selectedMemberIds.includes(memberId.toString())
      ? selectedMemberIds.filter((id) => id !== memberId.toString())
      : [...selectedMemberIds, memberId.toString()];
    onSelectionChange(newSelection);
    setInputValue('');
    inputRef.current?.focus();
  };

  const selectedMembers = members.filter(m => selectedMemberIds.includes(m.member_id.toString()));
  const allowFormer = Boolean(systemSettings?.allowFormerMembersInSelectors);
  const filteredMembers = inputValue
    ? members.filter(m => {
        const matchesName = `${m.first_name} ${m.last_name}`.toLowerCase().includes(inputValue.toLowerCase());
        const notSelected = !selectedMemberIds.includes(m.member_id.toString());
        const statusOk = allowFormer ? true : m.status === 'registered';
        return matchesName && statusOk && notSelected;
      })
    : [];

  return (
    <div className="space-y-2" ref={wrapperRef}>
      <div className="relative">
        <Command>
          <CommandInput 
            ref={inputRef}
            placeholder={t('participants.searchPlaceholder')}
            value={inputValue}
            onValueChange={setInputValue}
            onFocus={() => setIsFocused(true)}
            className={cn(isFocused ? 'ring-2 ring-ring ring-offset-2' : '')}
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
      <div className="space-x-1 space-y-1">
        {selectedMembers.map(member => (
          <Badge key={member.member_id} variant="secondary" className="mr-1">
            {member.first_name} {member.last_name}
            <button 
              type="button"
              onClick={() => handleSelect(member.member_id)} 
              className="ml-2 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
};
