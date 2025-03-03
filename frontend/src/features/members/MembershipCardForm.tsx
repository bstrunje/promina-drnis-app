import React, { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Checkbox } from "../../../components/ui/checkbox";
import { Label } from "../../../components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../../../components/ui/select";
import { updateMembership } from "../../utils/api";
import { useToast } from "../../../components/ui/use-toast";

// Add direct reference to API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

interface MembershipCardFormProps {
  memberId: number;
  onSuccess: () => void;
  currentCardNumber?: string;
}

export default function MembershipCardForm({ 
  memberId, 
  onSuccess,
  currentCardNumber 
}: MembershipCardFormProps) {
  const { toast } = useToast();
  const [cardNumber, setCardNumber] = useState<string>(currentCardNumber || "");
  const [stampIssued, setStampIssued] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [availableCardNumbers, setAvailableCardNumbers] = useState<string[]>([]);
  const [isLoadingCardNumbers, setIsLoadingCardNumbers] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch available card numbers - using direct fetch for debugging
  useEffect(() => {
    async function fetchAvailableCardNumbers() {
      setIsLoadingCardNumbers(true);
      setErrorMessage(null);
      
      try {
        console.log("DIRECT FETCH: Fetching card numbers...");
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.error("No authentication token available");
          setErrorMessage("No authentication token available");
          return;
        }
        
        const response = await fetch(`${API_URL}/api/card-numbers/available`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log("Response status:", response.status);
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Available card numbers:", data);
        
        // Ensure we have an array
        if (Array.isArray(data)) {
          setAvailableCardNumbers(data);
        } else {
          console.error("Expected array but got:", typeof data);
          setAvailableCardNumbers([]);
        }
      } catch (error) {
        console.error("Card number fetch error:", error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        setErrorMessage(`Error loading card numbers: ${errorMsg}`);
        toast({
          title: "Error",
          description: "Failed to load card numbers. See console for details.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingCardNumbers(false);
      }
    }

    fetchAvailableCardNumbers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const today = new Date().toISOString();
      
      console.log("Submitting membership update:", {
        memberId,
        cardNumber,
        stampIssued,
        date: today
      });
      
      await updateMembership(memberId, {
        paymentDate: today,
        cardNumber,
        stampIssued,
      });

      toast({
        title: "Success",
        description: "Card details updated successfully",
        variant: "success",
      });
      
      onSuccess();
    } catch (error) {
      console.error('Card update error:', error);
      toast({
        title: "Error",
        description: "Failed to update card details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Debug info
  console.log("Rendering with:", {
    currentCardNumber,
    availableCardNumbers: availableCardNumbers.length,
    isLoading: isLoadingCardNumbers, 
    errorMessage
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cardNumber">Card Number</Label>
        
        {/* Temporarily use an input field for debugging */}
        <Input
          id="cardNumber"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          placeholder={isLoadingCardNumbers ? "Loading..." : "Enter card number"}
          disabled={isLoading}
        />
        
        {/* Debug info */}
        <div className="text-xs text-gray-500 mt-1">
          Available numbers: {availableCardNumbers.length}
          {availableCardNumbers.length > 0 && (
            <div className="mt-1 max-h-32 overflow-y-auto text-xs">
              {availableCardNumbers.map(num => (
                <div key={num} 
                     className="cursor-pointer hover:bg-gray-100 p-1"
                     onClick={() => setCardNumber(num)}>
                  {num}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {isLoadingCardNumbers && <p className="text-sm text-muted-foreground">Loading card numbers...</p>}
        {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox 
          id="stampIssued" 
          checked={stampIssued} 
          onCheckedChange={(checked) => setStampIssued(checked === true)}
        />
        <Label htmlFor="stampIssued">Stamp Issued</Label>
      </div>

      <Button type="submit" disabled={isLoading || !cardNumber}>
        {isLoading ? "Updating..." : "Update Card Details"}
      </Button>
    </form>
  );
}
