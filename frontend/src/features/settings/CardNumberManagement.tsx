import React, { useState, useEffect, ChangeEvent } from "react";
import { useTranslation } from 'react-i18next';
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { useToast } from "../../../components/ui/use-toast";
import { Trash2, RefreshCw, ArrowLeft } from "lucide-react";
// Zamijenjeno prema novoj modularnoj API strukturi
import { deleteCardNumber, addCardNumber, addCardNumberRange, getAllCardNumbers, getConsumedCardNumbers } from '../../utils/api/apiCards';
import { useCardNumberLength } from "../../hooks/useCardNumberLength";
import { useBranding } from '../../hooks/useBranding';

export default function CardNumberManagement() {
  const { t } = useTranslation('settings');
  const { getPrimaryColor } = useBranding();
  const { toast } = useToast(); 
  
  // Dohvati duljinu broja kartice iz postavki
  const { length: cardNumberLength } = useCardNumberLength();
  
  // Form states
  const [singleCardNumber, setSingleCardNumber] = useState("");
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [rangeEnd, setRangeEnd] = useState<number | null>(null);
  
  // Loading states
  const [isLoadingSingle, setIsLoadingSingle] = useState(false);
  const [isLoadingRange, setIsLoadingRange] = useState(false);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const [isDeletingCard, setIsDeletingCard] = useState<string | null>(null);
  
  // Data states
  const [cardStats, setCardStats] = useState<{
    total: number;
    available: number;
    assigned: number;
  }>({ total: 0, available: 0, assigned: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  const [allCardNumbers, setAllCardNumbers] = useState<{
    card_number: string;
    status: 'available' | 'assigned';
    member_id?: number;
    member_name?: string;
  }[]>([]);

  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'assigned' | 'consumed'>('all');

  // State za potrošene kartice
  const [consumedCardNumbers, setConsumedCardNumbers] = useState<{
    card_number: string;
    member_id: number | null;
    member_name: string | null;
    issued_at: string;
    consumed_at: string;
  }[]>([]);
  const [isLoadingConsumed, setIsLoadingConsumed] = useState(false);
  const [consumedSearch, setConsumedSearch] = useState("");
  // Označava je li potrošene kartice barem jednom dohvaćene
  const [hasLoadedConsumed, setHasLoadedConsumed] = useState(false);
  
  // UI state for accordion-style sections
  const [activeSection, setActiveSection] = useState<"single" | "range" | "manage" | null>(null);

  // Fetch available card number count on load
  useEffect(() => {
    async function fetchCardNumbers() {
      setIsLoadingCount(true);
      try {
        const data = await getAllCardNumbers();
        setCardStats(data.stats);
        setAllCardNumbers(data.cards);
        
        // Kompatibilnost s originalnim kodom je sada osigurana kroz cardStats
      } catch (error) {
        console.error('Error fetching card numbers:', error);
        toast({
          title: "Error",
          description: "Failed to load card numbers",
          variant: "destructive",
        });
      } finally {
        setIsLoadingCount(false);
      }
    }
  
    void fetchCardNumbers();
  }, [toast]);

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validacija broja kartice prema dinamičkoj duljini
    const cardNumberRegex = new RegExp(`^\\d{${cardNumberLength}}$`);
    if (!cardNumberRegex.test(singleCardNumber)) {
      toast({
        title: "Validation Error",
        description: `Card number must be exactly ${cardNumberLength} digits`,
        variant: "destructive",
      });
      return;
    }
    
    setIsLoadingSingle(true);

    try {
      await addCardNumber(singleCardNumber);
      
      toast({
        title: "Success",
        description: "Card number added successfully",
        variant: "success",
      });
      
      setSingleCardNumber("");
      
      // Refresh data
      void refreshCardNumbers();
    } catch (error) {
      console.error('Error adding card number:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add card number",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSingle(false);
    }
  };

  const handleSingleCardNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Dopustiti samo unos brojeva
    if (value === '' || /^\d+$/.test(value)) {
      setSingleCardNumber(value);
    }
  };

  const handleAddRange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rangeStart === null || rangeEnd === null) {
      toast({
        title: "Error",
        description: "Both start and end numbers are required",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoadingRange(true);

    try {
      await addCardNumberRange(rangeStart, rangeEnd);
      
      toast({
        title: "Success",
        description: "Card numbers added successfully",
        variant: "success",
      });
      
      setRangeStart(null);
      setRangeEnd(null);
      
      // Refresh data
      void refreshCardNumbers();
    } catch (error) {
      console.error('Error adding card number range:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add card number range",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRange(false);
    }
  };

  const handleDeleteCard = async (cardNumber: string) => {
    setIsDeletingCard(cardNumber);
    try {
      await deleteCardNumber(cardNumber);
      
      // Update local state
      // Nema više potrebe za setExistingCardNumbers
      setAllCardNumbers(prev => prev.filter(card => card.card_number !== cardNumber));
      setCardStats(prev => ({
        ...prev,
        available: prev.available - 1,
        total: prev.total - 1
      }));
      
      toast({
        title: "Success",
        description: `Card number ${cardNumber} deleted successfully`,
        variant: "success",
      });
    } catch (error) {
      console.error('Error deleting card number:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete card number",
        variant: "destructive",
      });
    } finally {
      setIsDeletingCard(null);
    }
  };

  // Add utility functions to handle pagination and filtering
  // Filtriraj po statusu, osim za potrošene kartice
  const filteredByStatus: typeof allCardNumbers = statusFilter === 'consumed'
    ? ([] as typeof allCardNumbers)
    : allCardNumbers.filter(card => {
        if (statusFilter === 'all') return true;
        return card.status === statusFilter;
      });

  // Za prikaz potrošenih kartica koristi zasebno filtriranje
  const filteredConsumed: typeof consumedCardNumbers = consumedCardNumbers.filter(card =>
    card.card_number.includes(consumedSearch) ||
    (card.member_name?.toLowerCase().includes(consumedSearch.toLowerCase()) ?? false)
  );

  const filteredCardNumbers: typeof allCardNumbers = filteredByStatus.filter(card => 
    card.card_number.includes(searchTerm)
  );

  const totalPages = statusFilter === 'consumed'
    ? Math.ceil(filteredConsumed.length / itemsPerPage)
    : Math.ceil(filteredCardNumbers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedConsumed: typeof consumedCardNumbers = filteredConsumed.slice(startIndex, startIndex + itemsPerPage);
  const paginatedAvailable: typeof allCardNumbers = filteredCardNumbers.slice(startIndex, startIndex + itemsPerPage);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const refreshCardNumbers = async () => {
    setIsLoadingCount(true);
    try {
      const data = await getAllCardNumbers();
      setCardStats(data.stats);
      setAllCardNumbers(data.cards);
      // Kompatibilnost s originalnim kodom je sada osigurana kroz cardStats
    } catch (error) {
      console.error('Error fetching card numbers:', error);
      toast({
        title: "Error",
        description: "Failed to load card numbers",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCount(false);
    }
  };

  // Dohvati potrošene kartice
  const fetchConsumedCardNumbers = async (search?: string) => {
    setIsLoadingConsumed(true);
    try {
      const data = await getConsumedCardNumbers(search);
      setConsumedCardNumbers(data);
      setHasLoadedConsumed(true);
    } catch (error) {
      console.error('Error fetching consumed card numbers:', error);
      toast({
        title: "Error",
        description: "Failed to load consumed card numbers",
        variant: "destructive",
      });
    } finally {
      setIsLoadingConsumed(false);
    }
  };

  // Automatski dohvat potrošenih kad se prebaci na taj filter
  useEffect(() => {
    if (statusFilter === 'consumed') {
      void fetchConsumedCardNumbers(consumedSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, consumedSearch]);

  // Prefetch potrošenih kartica pri mountu komponente
  // Kako bismo izbjegli početni prikaz "(...)" na gumbu i prikazali točan broj odmah
  useEffect(() => {
    if (!hasLoadedConsumed) {
      void fetchConsumedCardNumbers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="my-6">
      <CardHeader>
        <CardTitle>{t('cardNumberManagement.title')}</CardTitle>
        <CardDescription>
          {t('cardNumberManagement.description')}
        </CardDescription>
        {cardStats && (
          <div className="mt-2 text-sm font-medium flex flex-col space-y-1">
            <div className="flex items-center justify-between">
              <span>
                {t('cardNumberManagement.stats.total', { count: cardStats.total })}
                {isLoadingCount && <span className="ml-2">({t('cardNumberManagement.stats.refreshing')})</span>}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0" 
                title={t('cardNumberManagement.stats.refreshTitle')}
                onClick={() => { void refreshCardNumbers(); }}
                disabled={isLoadingCount}
              >
                <RefreshCw className={`h-3 w-3 ${isLoadingCount ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <div className="flex space-x-4">
              <span className="text-green-600">{t('cardNumberManagement.stats.available', { count: cardStats.available })}</span>
              <span style={{ color: getPrimaryColor() }}>{t('cardNumberManagement.stats.assigned', { count: cardStats.assigned })}</span>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* New accordion-style UI */}
        <div className="space-y-6">
          {/* Initial view showing all action buttons */}
          {!activeSection && (
            <div className="grid grid-cols-1 gap-4">
              <Button 
                onClick={() => setActiveSection("single")} 
                className="h-auto py-6 flex flex-col items-center justify-center"
                variant="outline"
              >
                <span className="text-lg font-medium">{t('cardNumberManagement.actions.addSingle.title')}</span>
                <span className="text-xs text-gray-500 mt-1">{t('cardNumberManagement.actions.addSingle.description')}</span>
              </Button>
              
              <Button 
                onClick={() => setActiveSection("range")} 
                className="h-auto py-6 flex flex-col items-center justify-center"
                variant="outline"
              >
                <span className="text-lg font-medium">{t('cardNumberManagement.actions.addRange.title')}</span>
                <span className="text-xs text-gray-500 mt-1">{t('cardNumberManagement.actions.addRange.description')}</span>
              </Button>
              
              <Button 
                onClick={() => setActiveSection("manage")} 
                className="h-auto py-6 flex flex-col items-center justify-center"
                variant="outline"
              >
                <span className="text-lg font-medium">{t('cardNumberManagement.actions.manage.title')}</span>
                <span className="text-xs text-gray-500 mt-1">{t('cardNumberManagement.actions.manage.description')}</span>
              </Button>
            </div>
          )}
          
          {/* Single Number Form */}
          {activeSection === "single" && (
            <div className="space-y-4">
              <div className="flex items-center mb-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setActiveSection(null)} 
                  className="mr-2"
                  size="sm"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> {t('cardNumberManagement.forms.addSingle.back')}
                </Button>
                <h3 className="text-lg font-semibold">{t('cardNumberManagement.forms.addSingle.title')}</h3>
              </div>
              
              <div className="bg-white p-6 rounded-lg border">
                <form onSubmit={(e) => { void handleAddSingle(e); }} className="space-y-4">
                  <Input
                    id="singleCardNumber"
                    placeholder={t('cardNumberManagement.forms.addSingle.placeholder', { length: cardNumberLength })}
                    value={singleCardNumber}
                    onChange={handleSingleCardNumberChange}
                    disabled={isLoadingSingle}
                    autoFocus
                  />
                  <div className="flex space-x-3 pt-2">
                    <Button 
                      type="submit" 
                      disabled={isLoadingSingle || singleCardNumber.length !== cardNumberLength}
                    >
                      {isLoadingSingle ? t('cardNumberManagement.forms.addSingle.adding') : t('cardNumberManagement.forms.addSingle.submit')}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setActiveSection(null)}
                    >
                      {t('cardNumberManagement.forms.addSingle.cancel')}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
          {/* Range Form */}
          {activeSection === "range" && (
            <div className="space-y-4">
              <div className="flex items-center mb-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setActiveSection(null)} 
                  className="mr-2"
                  size="sm"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> {t('cardNumberManagement.forms.addRange.back')}
                </Button>
                <h3 className="text-lg font-semibold">{t('cardNumberManagement.forms.addRange.title')}</h3>
              </div>
              
              <div className="bg-white p-6 rounded-lg border">
                <form onSubmit={(e) => { void handleAddRange(e); }} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="rangeStart" className="text-sm text-gray-500 mb-1 block">
                        {t('cardNumberManagement.forms.addRange.startLabel')}
                      </label>
                      <Input
                        id="rangeStart"
                        placeholder={t('cardNumberManagement.forms.addRange.startPlaceholder', { example: '1'.padStart(cardNumberLength, '0') })}
                        type="number"
                        value={rangeStart ?? ''}
                        onChange={(e) => setRangeStart(e.target.value ? parseInt(e.target.value) : null)}
                        disabled={isLoadingRange}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label htmlFor="rangeEnd" className="text-sm text-gray-500 mb-1 block">
                        {t('cardNumberManagement.forms.addRange.endLabel')}
                      </label>
                      <Input
                        id="rangeEnd"
                        placeholder={t('cardNumberManagement.forms.addRange.endPlaceholder', { example: '100'.padStart(cardNumberLength, '0') })}
                        type="number"
                        value={rangeEnd ?? ''}
                        onChange={(e) => setRangeEnd(e.target.value ? parseInt(e.target.value) : null)}
                        disabled={isLoadingRange}
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3 pt-2">
                    <Button 
                      type="submit" 
                      disabled={isLoadingRange || rangeStart === null || rangeEnd === null}
                    >
                      {isLoadingRange ? t('cardNumberManagement.forms.addRange.adding') : t('cardNumberManagement.forms.addRange.submit')}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setActiveSection(null)}
                    >
                      {t('cardNumberManagement.forms.addRange.cancel')}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {t('cardNumberManagement.forms.addRange.note')}
                  </p>
                </form>
              </div>
            </div>
          )}

          {/* Manage Numbers Section */}
          {activeSection === "manage" && (
            <div>
              <div className="flex items-center mb-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setActiveSection(null)} 
                  className="mr-2"
                  size="sm"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> {t('cardNumberManagement.forms.manage.back')}
                </Button>
                <h3 className="text-lg font-semibold mb-4">{t('cardNumberManagement.forms.manage.title')}</h3>
              </div>
              
              {/* Filter and view options */}
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mb-4 items-start">
                <Input
                  type="text"
                  placeholder={t('cardNumberManagement.forms.manage.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1); // Reset to first page on search
                  }}
                  className="max-w-md"
                />
              </div>
              
              {/* Status filters */}
              <div className="mb-4 flex flex-wrap gap-2">
                <Button 
                  variant={statusFilter === 'all' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  {t('cardNumberManagement.forms.manage.filters.all', { count: filteredCardNumbers.length })}
                </Button>
                <Button 
                  variant={statusFilter === 'available' ? 'default' : 'outline'}
                  size="sm" 
                  onClick={() => setStatusFilter('available')}
                  className="text-green-600"
                >
                  {t('cardNumberManagement.forms.manage.filters.available', { count: cardStats.available })}
                </Button>
                <Button 
                  variant={statusFilter === 'assigned' ? 'default' : 'outline'}
                  size="sm" 
                  onClick={() => setStatusFilter('assigned')}
                  style={{ color: getPrimaryColor() }}
                >
                  {t('cardNumberManagement.forms.manage.filters.assigned', { count: cardStats.assigned })}
                </Button>
                <Button
                  variant={statusFilter === 'consumed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('consumed')}
                  className="text-gray-600"
                >
                  {t('cardNumberManagement.forms.manage.filters.consumed')} ({hasLoadedConsumed ? consumedCardNumbers.length : '...'})
                </Button>
              </div>
              
              {/* Prikaz za potrošene kartice */}
              {statusFilter === 'consumed' ? (
                <div>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mb-4 items-start">
                    <Input
                      type="text"
                      placeholder={t('cardNumberManagement.forms.manage.consumedSearchPlaceholder')}
                      value={consumedSearch}
                      onChange={(e) => {
                        setConsumedSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="max-w-md"
                    />
                  </div>
                  {isLoadingConsumed ? (
                    <p className="text-sm text-muted-foreground">{t('cardNumberManagement.forms.manage.consumed.loading')}</p>
                  ) : filteredConsumed.length > 0 ? (
                    <>
                      <div className="mb-2 text-sm text-muted-foreground">
                        {t('cardNumberManagement.forms.manage.consumed.showing', { count: paginatedConsumed.length, total: filteredConsumed.length })}
                      </div>
                      <div className="border rounded-md max-h-[400px] overflow-y-auto divide-y">
                        {paginatedConsumed.map(card => (
                          <div key={card.card_number} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 hover:bg-gray-50">
                            <div className="flex flex-col">
                            <span className="font-medium select-all cursor-pointer text-gray-700" onClick={() => { void navigator.clipboard.writeText(card.card_number); }} title={t('cardNumberManagement.forms.manage.consumed.copyTooltip')}>
                                {card.card_number}
                              </span>
                              <span className="text-xs text-gray-500">{t('cardNumberManagement.forms.manage.consumed.member', { member: card.member_name ?? 'N/A' })}</span>
                              <span className="text-xs text-gray-400">{t('cardNumberManagement.forms.manage.consumed.issued', { date: card.consumed_at ? new Date(card.consumed_at).toLocaleDateString() : (card.issued_at ? new Date(card.issued_at).toLocaleDateString() : '-') })}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center space-x-2 mt-4">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={prevPage} 
                            disabled={currentPage === 1}
                          >
                            {t('cardNumberManagement.forms.manage.pagination.prevPage')}
                          </Button>
                          <span className="text-sm">
                            {t('cardNumberManagement.forms.manage.pagination.page', { page: currentPage, totalPages: totalPages })}
                          </span>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => { void nextPage(); }} 
                            disabled={currentPage === totalPages}
                          >
                            {t('cardNumberManagement.forms.manage.pagination.nextPage')}
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('cardNumberManagement.forms.manage.consumed.noCards')}</p>
                  )}
                  <div className="mt-4 text-xs text-muted-foreground">
                    <p>{t('cardNumberManagement.forms.manage.consumed.note')}</p>
                  </div>
                </div>
              ) : (
                // Prikaz za ostale statuse
                <>
                  {/* Stats */}
                  <div className="mb-2 text-sm text-muted-foreground">
                    {t('cardNumberManagement.forms.manage.stats.showing', { current: paginatedAvailable.length, total: filteredCardNumbers.length })}
                    {searchTerm && ` ${t('cardNumberManagement.forms.manage.stats.filtered', { total: filteredByStatus.length })}`} {t('cardNumberManagement.forms.manage.stats.numbers')}
                  </div>
                  
                  {/* Dropdown style list */}
                  <div className="border rounded-md max-h-[400px] overflow-y-auto divide-y">
                    {paginatedAvailable.map(card => (
                      <div 
                        key={card.card_number} 
                        className="flex items-center justify-between p-3 hover:bg-gray-50"
                        style={card.status === 'assigned' ? { backgroundColor: `${getPrimaryColor()}10` } : {}}
                      >
                        <div className="flex items-center space-x-2">
                          <span 
                            className="font-medium select-all cursor-pointer"
                            style={card.status === 'assigned' ? { color: getPrimaryColor() } : {}}
                            onClick={() => { void navigator.clipboard.writeText(card.card_number); }}
                            title={t('cardNumberManagement.forms.manage.assigned.copyTooltip')}
                          >
                            {card.card_number}
                          </span>
                          {card.status === 'assigned' && card.member_name && (
                            <span className="text-xs px-2 py-0.5 rounded" style={{ color: getPrimaryColor(), backgroundColor: `${getPrimaryColor()}20` }}>
                              {t('cardNumberManagement.forms.manage.assigned.assignedTo', { name: card.member_name })}
                            </span>
                          )}
                        </div>
                        
                        {card.status === 'available' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => { void handleDeleteCard(card.card_number); }}
                            disabled={isDeletingCard === card.card_number}
                          >
                            {isDeletingCard === card.card_number ? (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Pagination controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center space-x-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={prevPage} 
                        disabled={currentPage === 1}
                      >
                        {t('cardNumberManagement.forms.manage.pagination.previous')}
                      </Button>
                      <span className="text-sm">
                        {t('cardNumberManagement.forms.manage.pagination.page', { page: currentPage, totalPages: totalPages })}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => { void nextPage(); }} 
                        disabled={currentPage === totalPages}
                      >
                        {t('cardNumberManagement.forms.manage.pagination.next')}
                      </Button>
                    </div>
                  )}
                </>
              )}
              <div className="mt-4 text-sm text-muted-foreground">
                <p>{t('cardNumberManagement.forms.manage.notes.deleteNote')}</p>
                <p>{t('cardNumberManagement.forms.manage.notes.assignedNote')}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
