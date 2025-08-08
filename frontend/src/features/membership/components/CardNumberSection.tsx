import React from "react";
import { CardNumberSectionProps } from "../types/membershipTypes";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { ScrollArea } from "@components/ui/scroll-area";
import { cn } from "@/lib/utils";

const CardNumberSection: React.FC<CardNumberSectionProps> = ({ 
  member, 
  availableCardNumbers, 
  isLoadingCardNumbers, 
  cardStats, 
  isLoadingCardStats, 
  cardNumberLength, 
  refreshCardStats,
  cardNumber,
  isSubmitting,
  originalCardNumber,
  setCardNumber,
  handleCardNumberAssign,
  userRole
}) => {
  // Možemo li uređivati podatke? Dopušteno samo za admin i superuser
  const canEdit = userRole === 'member_administrator' || userRole === 'member_superuser';

  // Helper funkcija za određivanje stilova na temelju životnog statusa člana
  const getStatusColors = () => {
    switch (member.life_status) {
      case "employed/unemployed":
        return {
          bg: "bg-blue-100",
          text: "text-blue-800",
          cardBg: "bg-blue-300"
        };
      case "child/pupil/student":
        return {
          bg: "bg-green-100",
          text: "text-green-800",
          cardBg: "bg-green-300"
        };
      case "pensioner":
        return {
          bg: "bg-red-100",
          text: "text-red-800",
          cardBg: "bg-red-300"
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-800",
          cardBg: "bg-gray-300"
        };
    }
  };
  
  // Dohvati stilove za trenutnog člana (koristimo samo cardBg)
  const { cardBg } = getStatusColors();

  // Stil za karticu ovisno o statusu člana (zadržavamo postojeću funkciju za kompatibilnost)
  const getStatusColor = () => cardBg;

  return (
    <div className="space-y-4">
      {/* Trenutni status kartice */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium">Broj članske kartice</h4>
          
          {/* Gumb za osvježavanje statistike */}
          {canEdit && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => { void refreshCardStats(); }}
              disabled={isLoadingCardStats}
              className="h-8 text-xs"
            >
              <RefreshCw className={cn(
                "w-3 h-3 mr-1",
                isLoadingCardStats && "animate-spin"
              )} />
              Osvježi
            </Button>
          )}
        </div>
        
        {/* Trenutni broj kartice */}
        <div className="mb-3">
          <span className="text-sm text-gray-500">Trenutni broj kartice:</span>
          {(() => {
            const cardNumber =
              member.membership_details?.card_number;
            return cardNumber ? (
              <span
                className={`ml-2 px-3 py-1 rounded text-black ${getStatusColor()}`}
              >
                {cardNumber}
              </span>
            ) : (
              <span className="ml-2 text-gray-400">Nije dodijeljen</span>
            );
          })()}
        </div>
        
        {/* Statistika kartica */}
        {canEdit && cardStats && (
          <div className="mb-3 text-sm">
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
              <span className="hidden sm:inline">Ukupno: <span className="font-bold">{cardStats.total}</span> &nbsp;|&nbsp;</span> 
              Dostupno: <span className="font-bold">{cardStats.available}</span>
              <span className="hidden sm:inline"> &nbsp;|&nbsp; Dodijeljeno: <span className="font-bold">{cardStats.assigned}</span></span>
            </span>
          </div>
        )}
      </div>

      {/* Forma za dodjelu broja kartice */}
      {canEdit && (
        <form onSubmit={(e) => { void handleCardNumberAssign(e); }} className="space-y-3">
          <div>
            <Label htmlFor="card-number">Promijeni broj kartice</Label>
            <div className="mt-1">
              {/* Odabir broja kartice - prikaži select ako ima dostupnih brojeva, inače input */}
              {availableCardNumbers && availableCardNumbers.length > 0 ? (
                <Select
                  value={cardNumber}
                  onValueChange={setCardNumber}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Odaberi broj kartice" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Opcija za trenutni broj kartice ako postoji */}
                    {typeof member?.membership_details?.card_number === 'string' && member.membership_details.card_number !== '' && (
                      <SelectItem value={member.membership_details.card_number}>
                        {member.membership_details.card_number} (Trenutni)
                      </SelectItem>
                    )}

                    {/* Koristi ScrollArea za ograničavanje visine i omogućavanje skrolanja */}
                    <ScrollArea className="h-[200px]">
                      {/* Filtriraj trenutni broj kartice iz dostupnih brojeva da se izbjegnu duplikati */}
                      {availableCardNumbers
                        .filter(number => number !== member.membership_details?.card_number)
                        .map((number) => (
                          <SelectItem key={number} value={number}>
                            {number}
                          </SelectItem>
                        ))
                      }
                    </ScrollArea>
                  </SelectContent>
                </Select>
              ) : (
                <div>
                  {isLoadingCardNumbers ? (
                    <p className="text-sm text-gray-500">
                      Učitavanje brojeva kartica...
                    </p>
                  ) : (
                    <p className="text-sm text-amber-500">
                      Nema dostupnih brojeva kartica. Dodajte ih u
                      Postavkama.
                    </p>
                  )}
                  <Input
                    type="text"
                    id="card-number"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    pattern={`[0-9]{${cardNumberLength}}`}
                    title={`Broj kartice mora imati točno ${cardNumberLength} znamenki`}
                    maxLength={cardNumberLength}
                    className="w-full p-2 border rounded mt-1"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </div>
          </div>
          <Button
            type="submit"
            disabled={isSubmitting || !cardNumber || cardNumber === originalCardNumber}
            className={cn(
              "w-full bg-black hover:bg-blue-500 transition-colors",
              isSubmitting && "opacity-50",
              // Poseban stil kada je gumb deaktiviran zbog istog broja kartice
              cardNumber === originalCardNumber && !isSubmitting && cardNumber && "bg-gray-300 hover:bg-gray-300 cursor-not-allowed"
            )}
          >
            {isSubmitting ? "Promjena u tijeku..." : "Promijeni broj kartice"}
          </Button>
        </form>
      )}
    </div>
  );
};

export default CardNumberSection;
