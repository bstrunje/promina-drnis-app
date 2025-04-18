import React, { useState, useEffect, ChangeEvent } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { useToast } from "../../../components/ui/use-toast";
import { API_BASE_URL } from "@/utils/config";
import { Trash2, RefreshCw, ArrowLeft } from "lucide-react";
import { deleteCardNumber, getAvailableCardNumbers, addCardNumber, addCardNumberRange, getAllCardNumbers } from "../../utils/api";
import { useCardNumberLength } from "../../hooks/useCardNumberLength";

export default function CardNumberManagement() {
  const { toast } = useToast(); 
  
  // Dohvati duljinu broja kartice iz postavki
  const { length: cardNumberLength, isLoading: isLoadingCardLength } = useCardNumberLength();
  
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
  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const [existingCardNumbers, setExistingCardNumbers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [cardStats, setCardStats] = useState<{
    total: number;
    available: number;
    assigned: number;
  }>({ total: 0, available: 0, assigned: 0 });
  
  const [allCardNumbers, setAllCardNumbers] = useState<Array<{
    card_number: string;
    status: 'available' | 'assigned' | 'retired';
    member_id?: number;
    member_name?: string;
  }>>([]);

  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'assigned'>('all');
  
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
        
        // Keep this for existing code compatibility
        setAvailableCount(data.stats.available);
        setExistingCardNumbers(
          data.cards
            .filter(card => card.status === 'available')
            .map(card => card.card_number)
        );
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
  
    fetchCardNumbers();
  }, []);

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
      refreshCardNumbers();
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
      const result = await addCardNumberRange(rangeStart, rangeEnd);
      
      toast({
        title: "Success",
        description: "Card numbers added successfully",
        variant: "success",
      });
      
      setRangeStart(null);
      setRangeEnd(null);
      
      // Refresh data
      refreshCardNumbers();
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
      setExistingCardNumbers(prev => prev.filter(num => num !== cardNumber));
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
  const filteredByStatus = allCardNumbers.filter(card => {
    if (statusFilter === 'all') return true;
    return card.status === statusFilter;
  });

  const filteredCardNumbers = filteredByStatus.filter(card => 
    card.card_number.includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredCardNumbers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCardNumbers = filteredCardNumbers.slice(startIndex, startIndex + itemsPerPage);

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
      setAvailableCount(data.stats.available);
      setExistingCardNumbers(
        data.cards
          .filter(card => card.status === 'available')
          .map(card => card.card_number)
      );
    } catch (error) {
      console.error("Error refreshing card numbers:", error);
      toast({
        title: "Error",
        description: "Failed to refresh card numbers",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCount(false);
    }
  };

  return (
    <Card className="my-6">
      <CardHeader>
        <CardTitle>Card Number Management</CardTitle>
        <CardDescription>
          Add and manage membership card numbers
          {cardStats && (
            <div className="mt-2 text-sm font-medium flex flex-col space-y-1">
              <div className="flex items-center justify-between">
                <span>
                  Total card numbers: {cardStats.total}
                  {isLoadingCount && <span className="ml-2">(refreshing...)</span>}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0" 
                  title="Refresh card statistics"
                  onClick={refreshCardNumbers}
                  disabled={isLoadingCount}
                >
                  <RefreshCw className={`h-3 w-3 ${isLoadingCount ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <div className="flex space-x-4">
                <span className="text-green-600">Available: {cardStats.available}</span>
                <span className="text-blue-600">Assigned: {cardStats.assigned}</span>
              </div>
            </div>
          )}
        </CardDescription>
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
                <span className="text-lg font-medium">Add Single Number</span>
                <span className="text-xs text-gray-500 mt-1">Add an individual card number to the system</span>
              </Button>
              
              <Button 
                onClick={() => setActiveSection("range")} 
                className="h-auto py-6 flex flex-col items-center justify-center"
                variant="outline"
              >
                <span className="text-lg font-medium">Add Number Range</span>
                <span className="text-xs text-gray-500 mt-1">Add a sequential range of card numbers</span>
              </Button>
              
              <Button 
                onClick={() => setActiveSection("manage")} 
                className="h-auto py-6 flex flex-col items-center justify-center"
                variant="outline"
              >
                <span className="text-lg font-medium">Manage Numbers</span>
                <span className="text-xs text-gray-500 mt-1">View, search and delete existing card numbers</span>
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
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <h3 className="text-lg font-semibold">Add Single Card Number</h3>
              </div>
              
              <div className="bg-white p-6 rounded-lg border">
                <form onSubmit={handleAddSingle} className="space-y-4">
                  <Input
                    id="singleCardNumber"
                    placeholder={`Enter new card number (${cardNumberLength} digits)`}
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
                      {isLoadingSingle ? "Adding..." : "Add Card Number"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setActiveSection(null)}
                    >
                      Cancel
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
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <h3 className="text-lg font-semibold">Add Card Number Range</h3>
              </div>
              
              <div className="bg-white p-6 rounded-lg border">
                <form onSubmit={handleAddRange} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="rangeStart" className="text-sm text-gray-500 mb-1 block">
                        Start Number
                      </label>
                      <Input
                        id="rangeStart"
                        placeholder={`e.g., ${'1'.padStart(cardNumberLength, '0')}`}
                        type="number"
                        value={rangeStart !== null ? rangeStart : ''}
                        onChange={(e) => setRangeStart(e.target.value ? parseInt(e.target.value) : null)}
                        disabled={isLoadingRange}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label htmlFor="rangeEnd" className="text-sm text-gray-500 mb-1 block">
                        End Number
                      </label>
                      <Input
                        id="rangeEnd"
                        placeholder={`e.g., ${'100'.padStart(cardNumberLength, '0')}`}
                        type="number"
                        value={rangeEnd !== null ? rangeEnd : ''}
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
                      {isLoadingRange ? "Adding..." : "Add Card Number Range"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setActiveSection(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Numbers will be padded with leading zeros based on your system settings.
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
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <h3 className="text-lg font-semibold">Manage Card Numbers</h3>
              </div>
              
              {/* Filter and view options */}
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mb-4 items-start">
                <Input
                  type="text"
                  placeholder="Search card numbers..."
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
                  All ({filteredCardNumbers.length})
                </Button>
                <Button 
                  variant={statusFilter === 'available' ? 'default' : 'outline'}
                  size="sm" 
                  onClick={() => setStatusFilter('available')}
                  className="text-green-600"
                >
                  Available ({cardStats.available})
                </Button>
                <Button 
                  variant={statusFilter === 'assigned' ? 'default' : 'outline'}
                  size="sm" 
                  onClick={() => setStatusFilter('assigned')}
                  className="text-blue-600"
                >
                  Assigned ({cardStats.assigned})
                </Button>
              </div>
              
              {isLoadingCount ? (
                <p className="text-sm text-muted-foreground">Loading card numbers...</p>
              ) : filteredCardNumbers.length > 0 ? (
                <>
                  {/* Stats */}
                  <div className="mb-2 text-sm text-muted-foreground">
                    Showing {paginatedCardNumbers.length} of {filteredCardNumbers.length} 
                    {searchTerm && ` (filtered from ${filteredByStatus.length})`} numbers
                  </div>
                  
                  {/* Dropdown style list */}
                  <div className="border rounded-md max-h-[400px] overflow-y-auto divide-y">
                    {paginatedCardNumbers.map(card => (
                      <div 
                        key={card.card_number} 
                        className={`flex items-center justify-between p-3 hover:bg-gray-50 ${
                          card.status === 'assigned' ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span 
                            className={`font-medium select-all cursor-pointer ${
                              card.status === 'assigned' ? 'text-blue-600' : ''
                            }`}
                            onClick={() => navigator.clipboard.writeText(card.card_number)}
                            title="Click to copy"
                          >
                            {card.card_number}
                          </span>
                          {card.status === 'assigned' && card.member_name && (
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                              Assigned to: {card.member_name}
                            </span>
                          )}
                        </div>
                        
                        {card.status === 'available' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteCard(card.card_number)}
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
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={nextPage} 
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No card numbers found</p>
              )}
              
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Note: Only unused card numbers can be deleted. Click on a number to copy it.</p>
                <p>Cards already assigned to members are shown in blue.</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
