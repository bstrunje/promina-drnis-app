import React from "react";
import { useTranslation } from 'react-i18next';
import { CardNumberSectionProps } from "../types/membershipTypes";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { RefreshCw, Copy, X, RotateCw } from "lucide-react";
import { useToast } from "@components/ui/use-toast";
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
  userRole,
  generatedPassword,
  setGeneratedPassword,
  handleRegeneratePassword,
  isRegeneratingPassword,
  passwordStrategy
}) => {
  const { t } = useTranslation('profile');
  const { toast } = useToast();
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

  // Funkcija za kopiranje passworda u clipboard
  const copyPasswordToClipboard = async () => {
    if (!generatedPassword) return;
    
    try {
      await navigator.clipboard.writeText(generatedPassword);
      toast({
        title: t('membershipCard.toast.success'),
        description: t('membershipCard.password.copySuccess'),
        variant: "success",
      });
    } catch (err) {
      console.error('Failed to copy password:', err);
      toast({
        title: t('membershipCard.toast.error'),
        description: t('membershipCard.password.copyError'),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Trenutni status kartice */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium">{t('membershipCard.cardNumberLabel')}</h4>
          
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
              {t('membershipCard.refresh')}
            </Button>
          )}
        </div>
        
        {/* Trenutni broj kartice s Regenerate gumbom */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{t('membershipCard.currentCardNumber')}</span>
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
                <span className="ml-2 text-gray-400">{t('membershipCard.notAssigned')}</span>
              );
            })()}
          </div>
          
          {/* Regenerate Password gumb - samo za RANDOM_8 strategiju */}
          {canEdit && passwordStrategy === 'RANDOM_8' && member.membership_details?.card_number && (
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { void handleRegeneratePassword(); }}
                disabled={isRegeneratingPassword}
                className="w-full text-xs"
              >
                <RotateCw className={cn(
                  "w-3 h-3 mr-1",
                  isRegeneratingPassword && "animate-spin"
                )} />
                {isRegeneratingPassword 
                  ? t('membershipCard.regenerate.regenerating')
                  : t('membershipCard.regenerate.button')
                }
              </Button>
            </div>
          )}
        </div>
        
        {/* Statistika kartica */}
        {canEdit && cardStats && (
          <div className="mb-3 text-sm">
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
              <span className="hidden sm:inline">{t('membershipCard.stats.total')}: <span className="font-bold">{cardStats.total}</span> &nbsp;|&nbsp;</span> 
              {t('membershipCard.stats.available')}: <span className="font-bold">{cardStats.available}</span>
              <span className="hidden sm:inline"> &nbsp;|&nbsp; {t('membershipCard.stats.assigned')}: <span className="font-bold">{cardStats.assigned}</span></span>
            </span>
          </div>
        )}
      </div>

      {/* Forma za dodjelu broja kartice */}
      {canEdit && (
        <form onSubmit={(e) => { void handleCardNumberAssign(e); }} className="space-y-3">
          <div>
            <Label htmlFor="card-number">{t('membershipCard.changeCardNumber')}</Label>
            <div className="mt-1">
              {/* Odabir broja kartice - prikaži select ako ima dostupnih brojeva, inače input */}
              {availableCardNumbers && availableCardNumbers.length > 0 ? (
                <Select
                  value={cardNumber}
                  onValueChange={setCardNumber}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('membershipCard.selectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Opcija za trenutni broj kartice ako postoji */}
                    {typeof member?.membership_details?.card_number === 'string' && member.membership_details.card_number !== '' && (
                      <SelectItem value={member.membership_details.card_number}>
                        {member.membership_details.card_number} {t('membershipCard.currentSuffix')}
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
                      {t('membershipCard.loadingNumbers')}
                    </p>
                  ) : (
                    <p className="text-sm text-amber-500">
                      {t('membershipCard.noNumbers')}
                    </p>
                  )}
                  <Input
                    type="text"
                    id="card-number"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    pattern={`[0-9]{${cardNumberLength}}`}
                    title={t('membershipCard.inputTitle', { length: cardNumberLength })}
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
            {isSubmitting ? t('membershipCard.submit.submitting') : t('membershipCard.submit.change')}
          </Button>
        </form>
      )}

      {/* Prikaz generiranog passworda */}
      {generatedPassword && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h5 className="font-medium text-green-800">{t('membershipCard.password.title')}</h5>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGeneratedPassword(null)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <code className="flex-1 px-3 py-2 bg-white border border-green-300 rounded font-mono text-lg">
              {generatedPassword}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { void copyPasswordToClipboard(); }}
              className="shrink-0"
            >
              <Copy className="h-4 w-4 mr-1" />
              {t('membershipCard.password.copy')}
            </Button>
          </div>
          <p className="mt-2 text-xs text-green-700">
            {t('membershipCard.password.warning')}
          </p>
        </div>
      )}
    </div>
  );
};

export default CardNumberSection;
