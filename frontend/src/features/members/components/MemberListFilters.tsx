import React from 'react';
import {
  SortAsc,
  SortDesc,
  Filter,
  Search,
  XCircle
} from 'lucide-react';
import { Button } from '@components/ui/button'; // Promijenio @ putanju
import { Input } from '@components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@components/ui/select';
import { useTranslation } from 'react-i18next';

// Definirani tipovi za bolju type safety
type SortOrder = 'asc' | 'desc';
type SortCriteria = 'name' | 'hours';
type ActiveFilter = 'regular' | 'active' | 'passive' | 'paid' | 'unpaid' | 'all' | 'pending';
type AgeFilter = 'all' | 'adults';

export interface MemberListFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activeFilter: ActiveFilter;
  onActiveFilterChange: (value: ActiveFilter) => void;
  ageFilter: AgeFilter;
  onAgeFilterChange: (value: AgeFilter) => void;
  sortCriteria: SortCriteria;
  onSortCriteriaChange: (value: SortCriteria) => void;
  sortOrder: SortOrder;
  onSortOrderChange: (value: SortOrder) => void;
  groupType: string;
  onGroupTypeChange: (value: string) => void;
  onAdvancedFiltersClick: () => void;
  onCloseFilters?: () => void;
  advancedOpen: boolean;
}

/**
 * Komponenta za filtere i pretraživanje članova
 */
const MemberListFilters: React.FC<MemberListFiltersProps> = ({
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
  onAdvancedFiltersClick,
  onCloseFilters,
  advancedOpen
}) => {
  const { t } = useTranslation('members');

  // Provjera je li ekran mali (mobile/tablet)
  const isSmallScreen = () => {
    return window.innerWidth < 768; // md breakpoint u Tailwind-u
  };

  // Handler funkcije s boljim tipovima
  const handleActiveFilterChange = (value: string) => {
    onActiveFilterChange(value as ActiveFilter);
    // Zatvori filtere samo na malim ekranima
    if (isSmallScreen()) {
      onCloseFilters?.();
    }
  };

  const handleSortCriteriaChange = (value: string) => {
    onSortCriteriaChange(value as SortCriteria);
    // Zatvori filtere samo na malim ekranima
    if (isSmallScreen()) {
      onCloseFilters?.();
    }
  };

  const handleSortOrderToggle = () => {
    onSortOrderChange(sortOrder === "asc" ? "desc" : "asc");
  };

  const handleAgeFilterToggle = () => {
    onAgeFilterChange(ageFilter === "adults" ? "all" : "adults");
  };

  const handleGroupToggle = () => {
    onGroupTypeChange(groupType ? "" : "true");
  };

  
  return (
    <div className="flex flex-col md:flex-row gap-4">
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

        {/* Status filteri */}
        <div className="flex flex-col">
          <div className="flex flex-wrap md:flex-row flex-col gap-2">
            <Select
              value={activeFilter}
              onValueChange={handleActiveFilterChange}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder={t('memberListFilters.filters.activityStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">{t('memberListFilters.options.regular')}</SelectItem>
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
              onClick={handleAgeFilterToggle}
              title={ageFilter === "adults"
                ? t('memberListFilters.tooltips.showAllMembers')
                : t('memberListFilters.tooltips.showOnlyAdults')}
              className="min-w-[50px] md:min-w-[130px]"
            >
              <span>{t('memberListFilters.buttons.adults')}</span>
            </Button>
          </div>
        </div>

        {/* Sortiranje */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Select
                value={sortCriteria}
                onValueChange={handleSortCriteriaChange}
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
              onClick={handleSortOrderToggle}
              title={sortOrder === "asc"
                ? t('memberListFilters.tooltips.sortDescending')
                : t('memberListFilters.tooltips.sortAscending')}
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

        {/* Grupiranje i dodatni filteri */}
        <div className="flex flex-col">
          <div className="flex gap-2">
            <Button
              variant={groupType ? "default" : "outline"}
              size="sm"
              onClick={handleGroupToggle}
              title={groupType
                ? t('memberListFilters.tooltips.disableGrouping')
                : t('memberListFilters.tooltips.groupByMemberType')}
              className="flex-1 md:flex-none min-w-[50px] md:min-w-[130px]"
            >
              <span className="whitespace-nowrap">{t('memberListFilters.buttons.group')}</span>
            </Button>

            {/* Napredni filteri */}
            <Button
              variant={advancedOpen ? "default" : "outline"}
              size="sm"
              onClick={onAdvancedFiltersClick}
              className="flex-1 md:flex-none min-w-[50px] md:min-w-[130px]"
            >
              <span className="whitespace-nowrap">{t('memberListFilters.buttons.more')}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberListFilters;