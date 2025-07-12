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
  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Reorganizirani filteri za bolji mobilni prikaz */}
      <div className="flex flex-wrap md:flex-row flex-col gap-3 p-2 bg-gray-50 rounded-lg border border-gray-200 w-full">
        {/* Tražilica */}
        <div className="flex-1 md:max-w-[250px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Pretraži ime, prezime..."
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
                <SelectValue placeholder="Status aktivnosti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Svi članovi</SelectItem>
                <SelectItem value="active">Aktivni</SelectItem>
                <SelectItem value="passive">Pasivni</SelectItem>
                <SelectItem value="paid">Plaćeno</SelectItem>
                <SelectItem value="unpaid">Nije plaćeno</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant={ageFilter === "adults" ? "default" : "outline"}
              size="sm"
              onClick={() => onAgeFilterChange(ageFilter === "adults" ? "all" : "adults")}
              title={ageFilter === "adults" ? "Prikaži sve članove" : "Prikaži samo punoljetne"}
              className="min-w-[50px] md:min-w-[130px]"
            >
              <span>Punoljetni</span>
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
                  <SelectValue placeholder="Sortiraj po" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Sortiraj po imenu</SelectItem>
                  <SelectItem value="hours">Sortiraj po satima</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")}
              title={`Sort ${sortOrder === "asc" ? "descending" : "ascending"}`}
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
              title={groupType ? "Disable grouping" : "Group by member type"}
              className="flex-1 md:flex-none min-w-[50px] md:min-w-[130px]"
            >
              <span className="whitespace-nowrap">Grupiraj</span>
            </Button>
            
            {onToggleColoredRows && (
              <Button
                variant={showOnlyColored ? "default" : "outline"}
                size="sm"
                onClick={onToggleColoredRows}
                title={showOnlyColored ? "Prikaži sve članove" : "Prikaži samo obojane retke"}
                className="flex-1 md:flex-none min-w-[50px] md:min-w-[130px]"
              >
                <Palette className="h-4 w-4 mr-1" />
                <span className="whitespace-nowrap">Obojani</span>
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
