import React from 'react';
import { 
  SortAsc, 
  SortDesc, 
  Filter, 
  Search, 
  XCircle 
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
  onGroupTypeChange
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Pretraži ime, prezime ili OIB..."
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
              aria-label="Obriši pretragu"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <Select value={activeFilter} onValueChange={(value: any) => onActiveFilterChange(value)}>
          <SelectTrigger className="w-[130px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status aktivnosti" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Svi članovi</SelectItem>
            <SelectItem value="active">Aktivni</SelectItem>
            <SelectItem value="passive">Pasivni</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={ageFilter} onValueChange={(value: any) => onAgeFilterChange(value)}>
          <SelectTrigger className="w-[130px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Dobna skupina" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Svi članovi</SelectItem>
            <SelectItem value="adults">Punoljetni (18+)</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={sortCriteria} onValueChange={(value: any) => onSortCriteriaChange(value)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Sortiraj po" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Imenu</SelectItem>
            <SelectItem value="hours">Satima</SelectItem>
          </SelectContent>
        </Select>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")}
          title={`Sort ${sortOrder === "asc" ? "descending" : "ascending"}`}
        >
          {sortOrder === "asc" ? (
            <SortAsc className="h-4 w-4" />
          ) : (
            <SortDesc className="h-4 w-4" />
          )}
        </Button>
        
        <Button
          variant={groupType ? "default" : "outline"}
          size="sm"
          onClick={() => onGroupTypeChange(groupType ? "" : "true")}
          title={groupType ? "Disable grouping" : "Group by member type"}
        >
          Group by Type
        </Button>
      </div>
    </div>
  );
};

export default MemberListFilters;
