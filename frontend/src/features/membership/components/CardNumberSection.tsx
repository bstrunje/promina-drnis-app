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
import { cn } from "@/lib/utils";

const CardNumberSection: React.FC<CardNumberSectionProps> = ({ 
  member, 
  availableCardNumbers, 
  isLoadingCardNumbers, 
  cardStats, 
  isLoadingCardStats, 
  cardNumberLength, 
  isLoadingCardLength, 
  refreshCardStats,
  cardNumber,
  isSubmitting,
  originalCardNumber,
  setCardNumber,
  handleCardNumberAssign,
  userRole
}) => {
  // Možemo li uređivati podatke? Dopušteno samo za admin i superuser
  const canEdit = userRole === 'admin' || userRole === 'superuser';

  // Stil za karticu ovisno o statusu člana
  const getStatusColor = () => {
    switch (member.life_status) {
      case "employed/unemployed":
        return "bg-blue-300";
      case "child/pupil/student":
        return "bg-green-300";
      case "pensioner":
        return "bg-red-300";
      default:
        return "bg-gray-600";
    }
  };

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
              onClick={refreshCardStats}
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
              member.membership_details?.card_number || member.card_number;
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
          <div className="grid grid-cols-3 gap-2 mb-3 text-center text-sm">
            <div className="bg-gray-100 p-2 rounded">
              <div className="text-gray-500">Ukupno</div>
              <div className="font-bold">{cardStats.total}</div>
            </div>
            <div className="bg-green-100 p-2 rounded">
              <div className="text-gray-500">Dostupno</div>
              <div className="font-bold text-green-600">
                {cardStats.available}
              </div>
            </div>
            <div className="bg-blue-100 p-2 rounded">
              <div className="text-gray-500">Dodijeljeno</div>
              <div className="font-bold text-blue-600">
                {cardStats.assigned}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Forma za dodjelu broja kartice */}
      {canEdit && (
        <form onSubmit={handleCardNumberAssign} className="space-y-3">
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
                    {member.membership_details?.card_number && (
                      <SelectItem value={member.membership_details.card_number}>
                        {member.membership_details.card_number} (Trenutni)
                      </SelectItem>
                    )}

                    {/* Filtriraj trenutni broj kartice iz dostupnih brojeva da se izbjegnu duplikati */}
                    {availableCardNumbers
                      .filter(number => number !== member.membership_details?.card_number)
                      .map((number) => (
                        <SelectItem key={number} value={number}>
                          {number}
                        </SelectItem>
                      ))
                    }
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
