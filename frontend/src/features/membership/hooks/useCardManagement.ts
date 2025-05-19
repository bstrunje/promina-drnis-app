import { useState, useEffect, useCallback } from "react";
import { useToast } from "@components/ui/use-toast";
import { Member } from "@shared/member";
// Zamijenjeno prema novoj modularnoj API strukturi
import { getAvailableCardNumbers, getAllCardNumbers } from '../../../utils/api/apiCards';
import { updateMembership } from '../../../utils/api/apiMembership';
import { useCardNumberLength } from "../../../hooks/useCardNumberLength";
import { CardStats } from "../types/membershipTypes";

// Tip za pojedinačnu karticu iz API responsa
// Status može biti samo 'available' ili 'assigned' – 'retired' nije prihvatljiv u aplikaciji
interface CardInfo {
  card_number: string;
  status: "available" | "assigned";
  member_id?: number;
  member_name?: string;
}


export const useCardManagement = (member: Member, onUpdate: (member: Member) => Promise<void>) => {
  const { toast } = useToast();
  
  // Inicijaliziraj stanje iz membership_details (izvor istine), a zatim iz direktnih property-a
  const [cardNumber, setCardNumber] = useState(
    member?.membership_details?.card_number ?? "" // Uvijek koristi samo membership_details.card_number
  );
  const [originalCardNumber, setOriginalCardNumber] = useState(
    member?.membership_details?.card_number ?? "" // Uvijek koristi samo membership_details.card_number
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableCardNumbers, setAvailableCardNumbers] = useState<string[]>([]);
  const [isLoadingCardNumbers, setIsLoadingCardNumbers] = useState(false);
  const [cardStats, setCardStats] = useState<CardStats | null>(null);
  const [isLoadingCardStats, setIsLoadingCardStats] = useState(false);

  // Dohvati dinamičku duljinu broja kartice
  const { length: cardNumberLength, isLoading: isLoadingCardLength } = useCardNumberLength();

  // Kada se podaci o članu promijene, ažuriraj iz ispravnog izvora
  useEffect(() => {
    if (member) {
      setCardNumber(
        member.membership_details?.card_number ?? "" // Uvijek koristi samo membership_details.card_number
      );
      setOriginalCardNumber(
        member.membership_details?.card_number ?? "" // Uvijek koristi samo membership_details.card_number
      );
    }
  }, [member]);

  // Dohvati dostupne brojeve kartica
  useEffect(() => {
    const fetchCardNumbers = async () => {
      setIsLoadingCardNumbers(true);
      try {
        const numbers = await getAvailableCardNumbers();
        setAvailableCardNumbers(numbers ?? []); // ESLint: koristimo ??
      } catch (error) {
        console.error("Nije moguće dohvatiti dostupne brojeve kartica:", error);
        toast({
          title: "Greška",
          description: "Nije moguće dohvatiti dostupne brojeve kartica",
          variant: "destructive",
        });
      } finally {
        setIsLoadingCardNumbers(false);
      }
    };

    void fetchCardNumbers();
  }, [toast]);

  // Funkcija za osvježavanje statistike kartica
  // Tipiziramo podatke iz API-a i koristimo nullish coalescing
  const refreshCardStats = useCallback(async () => {
    setIsLoadingCardStats(true);
    try {
      const data: { stats: CardStats; cards: CardInfo[] } = await getAllCardNumbers();
      setCardStats(data.stats);

      // Osvježi dostupne brojeve kartica ako je potrebno
      // Filtriramo sve kartice koje nisu 'available' ili 'assigned', 'retired' ignoriramo jer nije prihvatljiv status
      setAvailableCardNumbers(
        (data.cards ?? [])
          .filter((card) => card.status === "available" || card.status === "assigned")
          .map((card) => card.card_number)
      );
    } catch (error: unknown) {
      // Sigurno logiranje greške
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Nije moguće dohvatiti statistiku kartica:", errorMessage);
      toast({
        title: "Greška",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingCardStats(false);
    }
  }, [toast]);

  useEffect(() => {
    void refreshCardStats();
    // Dodajemo refreshCardStats u dependency array radi exhaustiveness
  }, [refreshCardStats]);

  // Funkcija za dodjelu broja kartice
  const handleCardNumberAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const data = {
      cardNumber,
    };

    try {
      const response = await updateMembership(member.member_id, data);

      if (!response) {
        throw new Error("Nema odgovora od servera");
      }

      // Ažuriraj lokalno stanje s prioritetom na membership_details
      // Ažuriraj samo membership_details.card_number, Member.card_number se više ne koristi
      await onUpdate({
        ...member,
        membership_details: {
          ...member.membership_details,
          card_number: cardNumber,
        }
      });

      toast({
        title: "Uspjeh",
        description: "Broj kartice uspješno dodijeljen",
        variant: "success",
      });
    }catch (error: unknown) {
      // Sigurno logiranje greške
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Detalji greške kod dodjele kartice:", {
        error: errorMessage,
        memberId: member.member_id,
        cardNumber,
        memberData: member,
      });
    
      toast({
        title: "Greška",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    cardNumber,
    setCardNumber,
    originalCardNumber,
    isSubmitting,
    availableCardNumbers,
    isLoadingCardNumbers,
    cardStats,
    isLoadingCardStats,
    cardNumberLength,
    isLoadingCardLength,
    refreshCardStats,
    handleCardNumberAssign,
  };
};
