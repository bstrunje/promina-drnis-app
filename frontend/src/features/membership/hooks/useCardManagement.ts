import { useState, useEffect } from "react";
import { useToast } from "@components/ui/use-toast";
import { Member } from "@shared/member";
// Zamijenjeno prema novoj modularnoj API strukturi
import { getAvailableCardNumbers, getAllCardNumbers } from '../../../utils/api/apiCards';
import { updateMembership } from '../../../utils/api/apiMembership';
import { useCardNumberLength } from "../../../hooks/useCardNumberLength";
import { CardStats } from "../types/membershipTypes";

export const useCardManagement = (member: Member, onUpdate: (member: Member) => Promise<void>) => {
  const { toast } = useToast();
  
  // Inicijaliziraj stanje iz membership_details (izvor istine), a zatim iz direktnih property-a
  const [cardNumber, setCardNumber] = useState(
    member?.membership_details?.card_number || member?.card_number || ""
  );
  const [originalCardNumber, setOriginalCardNumber] = useState(
    member?.membership_details?.card_number || member?.card_number || ""
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
        member.membership_details?.card_number || member.card_number || ""
      );
      setOriginalCardNumber(
        member.membership_details?.card_number || member.card_number || ""
      );
    }
  }, [member]);

  // Dohvati dostupne brojeve kartica
  useEffect(() => {
    const fetchCardNumbers = async () => {
      setIsLoadingCardNumbers(true);
      try {
        const numbers = await getAvailableCardNumbers();
        setAvailableCardNumbers(numbers || []);
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

    fetchCardNumbers();
  }, [toast]);

  // Funkcija za osvježavanje statistike kartica
  const refreshCardStats = async () => {
    setIsLoadingCardStats(true);
    try {
      const data = await getAllCardNumbers();
      setCardStats(data.stats);

      // Osvježi dostupne brojeve kartica ako je potrebno
      setAvailableCardNumbers(
        data.cards
          .filter((card: any) => card.status === "available")
          .map((card: any) => card.card_number)
      );
    } catch (error) {
      console.error("Nije moguće osvježiti statistiku kartica:", error);
    } finally {
      setIsLoadingCardStats(false);
    }
  };

  useEffect(() => {
    refreshCardStats();
  }, []);

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
      await onUpdate({
        ...member,
        membership_details: {
          ...member.membership_details,
          card_number: cardNumber,
        },
        // Postavi ove vrijednosti i za kompatibilnost s prethodnim kodom, ali membership_details je izvor istine
        card_number: cardNumber,
      });

      toast({
        title: "Uspjeh",
        description: "Broj kartice uspješno dodijeljen",
        variant: "success",
      });
    } catch (error: any) {
      console.error("Detalji greške kod dodjele kartice:", {
        error,
        memberId: member.member_id,
        cardNumber,
        memberData: member,
      });

      const errorMessage =
        error instanceof Error ? error.message : "Dogodila se nepoznata greška";

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
