import React, { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { useToast } from "../../../components/ui/use-toast";
import { API_BASE_URL } from "@/utils/config";
import { Trash2 } from "lucide-react";
import { deleteCardNumber, getAvailableCardNumbers, addCardNumber, addCardNumberRange } from "../../utils/api";

export default function CardNumberManagement() {
  const { toast } = useToast(); // Move this inside the component
  
  const [singleCardNumber, setSingleCardNumber] = useState("");
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [rangeEnd, setRangeEnd] = useState<number | null>(null);
  const [isLoadingSingle, setIsLoadingSingle] = useState(false);
  const [isLoadingRange, setIsLoadingRange] = useState(false);
  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const [existingCardNumbers, setExistingCardNumbers] = useState<string[]>([]);
  const [isDeletingCard, setIsDeletingCard] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Fetch available card number count
  useEffect(() => {
    async function fetchAvailableCardNumberCount() {
      setIsLoadingCount(true);
      try {
        const numbers = await getAvailableCardNumbers();
        console.log("Available card numbers:", numbers);
        setAvailableCount(numbers.length);
        setExistingCardNumbers(numbers); // Store the actual numbers too
      } catch (error) {
        console.error('Error fetching card numbers count:', error);
      } finally {
        setIsLoadingCount(false);
      }
    }

    fetchAvailableCardNumberCount();
  }, []);

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingSingle(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/card-numbers/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ cardNumber: singleCardNumber })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to add card number');
      }

      toast({
        title: "Success",
        description: "Card number added successfully",
        variant: "success",
      });
      
      setSingleCardNumber("");
      
      // Refresh available count
      const countResponse = await fetch(`${API_BASE_URL}/card-numbers/available`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (countResponse.ok) {
        const data = await countResponse.json();
        setAvailableCount(data.length);
      }
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/card-numbers/add-range`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          start: rangeStart,
          end: rangeEnd
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to add card number range');
      }

      const data = await response.json();
      
      toast({
        title: "Success",
        description: data.message || "Card numbers added successfully",
        variant: "success",
      });
      
      setRangeStart(null);
      setRangeEnd(null);
      
      // Refresh available count
      const countResponse = await fetch(`${API_BASE_URL}/card-numbers/available`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (countResponse.ok) {
        const countData = await countResponse.json();
        setAvailableCount(countData.length);
      }
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
      setAvailableCount(prev => prev !== null ? prev - 1 : null);
      
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
  const filteredCardNumbers = existingCardNumbers.filter(number => 
    number.includes(searchTerm)
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

  return (
    <Card className="my-6">
      <CardHeader>
        <CardTitle>Card Number Management</CardTitle>
        <CardDescription>
          Add and manage membership card numbers
          {availableCount !== null && (
            <div className="mt-2 text-sm font-medium">
              Available card numbers: {availableCount}
              {isLoadingCount && <span className="ml-2 text-muted-foreground">(refreshing...)</span>}
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="single">Add Single</TabsTrigger>
            <TabsTrigger value="range">Add Range</TabsTrigger>
            <TabsTrigger value="manage">Manage Numbers</TabsTrigger>
          </TabsList>
          
          <TabsContent value="single" className="mt-4">
            <form onSubmit={handleAddSingle} className="space-y-4">
              <div className="space-y-2">
                <Input
                  id="singleCardNumber"
                  placeholder="Enter card number (e.g., 00123)"
                  value={singleCardNumber}
                  onChange={(e) => setSingleCardNumber(e.target.value)}
                  disabled={isLoadingSingle}
                />
              </div>
              
              <Button type="submit" disabled={isLoadingSingle || !singleCardNumber}>
                {isLoadingSingle ? "Adding..." : "Add Card Number"}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="range" className="mt-4">
            <form onSubmit={handleAddRange} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Input
                    id="rangeStart"
                    placeholder="Start (e.g., 100)"
                    type="number"
                    value={rangeStart !== null ? rangeStart : ''}
                    onChange={(e) => setRangeStart(e.target.value ? parseInt(e.target.value) : null)}
                    disabled={isLoadingRange}
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    id="rangeEnd"
                    placeholder="End (e.g., 200)"
                    type="number"
                    value={rangeEnd !== null ? rangeEnd : ''}
                    onChange={(e) => setRangeEnd(e.target.value ? parseInt(e.target.value) : null)}
                    disabled={isLoadingRange}
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                disabled={isLoadingRange || rangeStart === null || rangeEnd === null}
              >
                {isLoadingRange ? "Adding..." : "Add Card Number Range"}
              </Button>
              
              <p className="text-sm text-muted-foreground">
                Numbers will be padded with leading zeros based on your system settings.
              </p>
            </form>
          </TabsContent>

          <TabsContent value="manage" className="mt-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Available Card Numbers</h3>
              
              {/* Search input */}
              <div className="mb-4">
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
              
              {isLoadingCount ? (
                <p className="text-sm text-muted-foreground">Loading card numbers...</p>
              ) : existingCardNumbers.length > 0 ? (
                <>
                  {/* Stats */}
                  <div className="mb-2 text-sm text-muted-foreground">
                    Showing {paginatedCardNumbers.length} of {filteredCardNumbers.length} 
                    {searchTerm && ` (filtered from ${existingCardNumbers.length})`} numbers
                  </div>
                  
                  {/* Dropdown style list */}
                  <div className="border rounded-md max-h-[400px] overflow-y-auto divide-y">
                    {paginatedCardNumbers.map(number => (
                      <div 
                        key={number} 
                        className="flex items-center justify-between p-3 hover:bg-gray-50"
                      >
                        <span className="font-medium select-all cursor-pointer" 
                              onClick={() => navigator.clipboard.writeText(number)}
                              title="Click to copy"
                        >{number}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteCard(number)}
                          disabled={isDeletingCard === number}
                        >
                          {isDeletingCard === number ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
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
                <p className="text-sm text-muted-foreground">No card numbers available</p>
              )}
              
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Note: Only unused card numbers can be deleted. Click on a number to copy it.</p>
                <p>Card numbers already assigned to members cannot be removed.</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
