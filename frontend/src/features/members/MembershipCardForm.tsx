import React, { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Checkbox } from "../../../components/ui/checkbox";
import { Label } from "../../../components/ui/label";
import { useTranslation } from 'react-i18next';

// Zamijenjeno prema novoj modularnoj API strukturi
import { updateMembership } from '../../utils/api/apiMembership';
import { useToast } from "../../../components/ui/use-toast";
import { useCardNumberLength } from "../../hooks/useCardNumberLength";
import { formatDate, getCurrentDate } from "../../utils/dateUtils";

// Add direct reference to API
const API_URL = process.env.REACT_APP_API_URL ?? 'http://localhost:3000';

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
  const { t } = useTranslation('members');
  const { length: cardNumberLength } = useCardNumberLength();
  const [cardNumber, setCardNumber] = useState<string>(currentCardNumber ?? "");
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
        
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }
        
        const data: unknown = await response.json();
        // Provjera da je array stringova zbog sigurnosti
        if (Array.isArray(data) && data.every((item) => typeof item === 'string')) {
          setAvailableCardNumbers(data);
        } else {
          console.error("Expected array of strings but got:", data);
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

    void fetchAvailableCardNumbers();
  }, [toast]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    // Validacija broja kartice prema dinamičkoj duljini
    const cardNumberRegex = new RegExp(`^\\d{${cardNumberLength}}$`);
    if (cardNumber && !cardNumberRegex.test(cardNumber)) {
      toast({
        title: t('membershipCard.messages.validationError'),
        description: t('membershipCard.messages.cardNumberMustBe', { length: cardNumberLength }),
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      // Mora biti string, ne Date, zbog API očekivanja
      const today = formatDate(getCurrentDate(), 'yyyy-MM-dd');
      
      await updateMembership(memberId, {
        paymentDate: today,
        cardNumber,
        stampIssued,
      });

      toast({
        title: t('membershipCard.messages.success'),
        description: t('membershipCard.messages.cardDetailsUpdated'),
        variant: "success",
      });
      
      onSuccess();
    } catch (error) {
      console.error('Card update error:', error);
      toast({
        title: t('membershipCard.messages.error'),
        description: t('membershipCard.messages.failedToUpdate'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Dopustiti samo unos brojeva
    // Ovdje nije smisleno koristiti ?? jer želimo dopustiti ili prazan string ili samo brojeve
    if (value === '' || /^\d+$/.test(value)) {
      setCardNumber(value);
    }
  };

  return (
    <form onSubmit={e => void handleSubmit(e)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cardNumber">{t('membershipCard.form.cardNumber')}</Label>
        
        {/* Ažurirano polje za unos broja kartice */}
        <Input
          id="cardNumber"
          value={cardNumber}
          onChange={handleCardNumberChange}
          placeholder={isLoadingCardNumbers ? t('membershipCard.placeholders.loading') : t('membershipCard.placeholders.enterCardNumber', { length: cardNumberLength })}
          disabled={isLoading}
          maxLength={cardNumberLength}
        />
        
        {/* Debug info */}
        <div className="text-xs text-gray-500 mt-1">
          {t('membershipCard.messages.availableNumbers')} {availableCardNumbers.length}
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
        
        {isLoadingCardNumbers && <p className="text-sm text-muted-foreground">{t('membershipCard.messages.loadingCardNumbers')}</p>}
        {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox 
          id="stampIssued" 
          checked={stampIssued} 
          onCheckedChange={(checked) => setStampIssued(checked === true)}
        />
        <Label htmlFor="stampIssued">{t('membershipCard.form.stampIssued')}</Label>
      </div>

      <Button type="submit" disabled={isLoading || !cardNumber}>
        {isLoading ? t('membershipCard.form.updating') : t('membershipCard.form.updateCardDetails')}
      </Button>
    </form>
  );
}
