import React from 'react';
import { 
  SortAsc, 
  SortDesc, 
  Filter, 
  Search, 
  XCircle,

  Palette,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@components/ui/select';
import { useTranslation } from 'react-i18next';

export interface MemberListFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activeFilter: string;
  onActiveFilterChange: (value: string) => void;
  ageFilter: string;
  onAgeFilterChange: (value: string) => void;
  sortCriteria: string;
  onSortCriteriaChange: (value: string) => void;
  sortOrder: string;
  onSortOrderChange: (value: string) => void;
  groupType: string;
  onGroupTypeChange: (value: string) => void;
  showOnlyColored?: boolean;
  onToggleColoredRows?: () => void;
  onCloseFilters?: () => void;
}

/**
 * Komponenta za filtere i pretraživanje članova
 */
export const MemberListFilters: React.FC<MemberListFiltersProps> = ({
  searchTerm,
  onSearchChange,
  activeFilter,
  onActiveFilterChange,
  ageFilter,
  onAgeFilterChange,
  sortCriteria,
  onSortCriteriaChange,
  sortOrder,
  onSortOrderChange,
  groupType,
  onGroupTypeChange,
  showOnlyColored,
  onToggleColoredRows,
  onCloseFilters
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Reorganizirani filteri za bolji mobilni prikaz */}
      <div className="flex flex-wrap md:flex-row flex-col gap-3 p-2 bg-gray-50 rounded-lg border border-gray-200 w-full">
        {/* Tražilica */}
        <div className="flex-1 md:max-w-[250px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={t('memberListFilters.search.placeholder')}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                aria-label={t('memberListFilters.search.clearSearch')}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex flex-col">
          <div className="flex flex-wrap md:flex-row flex-col gap-2">
            <Select
              value={activeFilter}
              onValueChange={(value: string) => {
                onActiveFilterChange(value);
                if (onCloseFilters) {
                  onCloseFilters();
                }
              }}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder={t('memberListFilters.filters.activityStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('memberListFilters.options.allMembers')}</SelectItem>
                <SelectItem value="active">{t('memberListFilters.options.active')}</SelectItem>
                <SelectItem value="passive">{t('memberListFilters.options.passive')}</SelectItem>
                <SelectItem value="paid">{t('memberListFilters.options.paid')}</SelectItem>
                <SelectItem value="unpaid">{t('memberListFilters.options.unpaid')}</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant={ageFilter === "adults" ? "default" : "outline"}
              size="sm"
              onClick={() => onAgeFilterChange(ageFilter === "adults" ? "all" : "adults")}
              title={ageFilter === "adults" ? t('memberListFilters.tooltips.showAllMembers') : t('memberListFilters.tooltips.showOnlyAdults')}
              className="min-w-[50px] md:min-w-[130px]"
            >
              <span>{t('memberListFilters.buttons.adults')}</span>
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Select
                value={sortCriteria}
                onValueChange={(value: string) => {
                  onSortCriteriaChange(value);
                  if (onCloseFilters) {
                    onCloseFilters();
                  }
                }}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder={t('memberListFilters.filters.sortBy')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">{t('memberListFilters.options.sortByName')}</SelectItem>
                  <SelectItem value="hours">{t('memberListFilters.options.sortByHours')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")}
              title={sortOrder === "asc" ? t('memberListFilters.tooltips.sortDescending') : t('memberListFilters.tooltips.sortAscending')}
              className="w-10 h-10 p-0 flex-shrink-0"
            >
              {sortOrder === "asc" ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col">
          <div className="flex gap-2">
            <Button
              variant={groupType ? "default" : "outline"}
              size="sm"
              onClick={() => onGroupTypeChange(groupType ? "" : "true")}
              title={groupType ? t('memberListFilters.tooltips.disableGrouping') : t('memberListFilters.tooltips.groupByMemberType')}
              className="flex-1 md:flex-none min-w-[50px] md:min-w-[130px]"
            >
              <span className="whitespace-nowrap">{t('memberListFilters.buttons.group')}</span>
            </Button>
            
            {onToggleColoredRows && (
              <Button
                variant={showOnlyColored ? "default" : "outline"}
                size="sm"
                onClick={onToggleColoredRows}
                title={showOnlyColored ? t('memberListFilters.tooltips.showAllMembers') : t('memberListFilters.tooltips.showOnlyColoredRows')}
                className="flex-1 md:flex-none min-w-[50px] md:min-w-[130px]"
              >
                <Palette className="h-4 w-4 mr-1" />
                <span className="whitespace-nowrap">{t('memberListFilters.buttons.colored')}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Gumb za spremanje filtera je uklonjen. Filteri se sada primjenjuju odmah pri odabiru. */}
    </div>
  );
};

export default MemberListFilters;
