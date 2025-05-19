import { useState, useEffect, useCallback } from "react";
import { useToast } from "@components/ui/use-toast";
import { Member } from "@shared/member";
// Zamijenjeno prema novoj modularnoj API strukturi
import api from '../../../utils/api/apiConfig';
import { InventoryStatus } from "../types/membershipTypes";
import { getCurrentYear } from "../../../utils/dateUtils";

export const useStampManagement = (member: Member, onUpdate: (member: Member) => Promise<void>) => {
  const { toast } = useToast();
  
  // Inicijaliziraj stanje iz membership_details (izvor istine)
  const [stampIssued, setStampIssued] = useState(
    member?.membership_details?.card_stamp_issued ?? false // Promjena: koristi ?? umjesto || zbog lint pravila
  );
  const [nextYearStampIssued, setNextYearStampIssued] = useState(
    member?.membership_details?.next_year_stamp_issued ?? false // Promjena: koristi ?? umjesto || zbog lint pravila
  );
  const [isIssuingStamp, setIsIssuingStamp] = useState(false);
  const [isIssuingNextYearStamp, setIsIssuingNextYearStamp] = useState(false);
  const [inventoryStatus, setInventoryStatus] = useState<InventoryStatus | null>(null);
  const [nextYearInventoryStatus, setNextYearInventoryStatus] = useState<InventoryStatus | null>(null);

  // Kada se podaci o članu promijene, ažuriraj iz ispravnog izvora
  useEffect(() => {
    if (member) {
      const newStampState = member.membership_details?.card_stamp_issued ?? false; // Promjena: koristi ?? umjesto || zbog lint pravila
      
      setStampIssued(newStampState);
      setNextYearStampIssued(member?.membership_details?.next_year_stamp_issued ?? false); // Promjena: koristi ?? umjesto || zbog lint pravila
    }
  }, [member]);

  // Funkcija za određivanje tipa markice prema statusu člana
  const getMemberStampType = useCallback((member: Member): string => {
    if (member.life_status === "employed/unemployed") {
      return "employed";
    } else if (member.life_status === "child/pupil/student") {
      return "student";
    } else if (member.life_status === "pensioner") {
      return "pensioner";
    }
    return "employed";
  }, []);

  // Provjeri zalihu markica
  useEffect(() => {
    const checkInventory = async () => {
      try {
        const response = await api.get<{ stamp_type: string; stamp_year: number; remaining: number }[]>("/stamps/inventory"); // Sigurnosna promjena: tipiziran response
        const data = response.data;

        const stampType = getMemberStampType(member);

        // Pronađi zalihu markica za tekuću godinu
        const currentYearInventory = data.find(
          (item) => item.stamp_type === stampType && item.stamp_year === getCurrentYear()
        );

        // Pronađi zalihu markica za sljedeću godinu
        const nextYearInventory = data.find(
          (item) => item.stamp_type === stampType && item.stamp_year === getCurrentYear() + 1
        );

        if (currentYearInventory) {
          setInventoryStatus({
            type: stampType,
            remaining: currentYearInventory.remaining,
            year: getCurrentYear(),
          });
        }

        if (nextYearInventory) {
          setNextYearInventoryStatus({
            type: stampType,
            remaining: nextYearInventory.remaining,
            year: getCurrentYear() + 1,
          });
        }
      } catch (error) {
        console.error("Greška kod provjere zalihe markica:", error);
        // Sigurnosna promjena: koristi se nullish coalescing umjesto ||
        toast({
          title: "Greška",
          description: error instanceof Error ? error.message : "Nije moguće provjeriti zalihu markica",
          variant: "destructive",
        });
      }
    };

    void checkInventory(); // Sigurnosna promjena: void za no-floating-promises
  }, [member.life_status, member, getMemberStampType, toast]);

  // Upravljanje izdavanjem markice za tekuću godinu
  const handleStampToggle = async (newState: boolean, userRole?: string) => {
    const canReturnStamp = userRole === "superuser";
    
    // Ako korisnik pokušava odznačiti markicu (vratiti u inventar), a nema dozvolu
    if (!newState && !canReturnStamp) {
      toast({
        title: "Nedovoljna prava",
        description: "Samo superadmin može vratiti markice u inventar",
        variant: "destructive",
      });
      return; 
    }
    
    // Provjeri zalihu prije izdavanja
    if (newState && inventoryStatus && inventoryStatus.remaining <= 0) {
      toast({
        title: "Greška",
        description: "Nema dostupnih markica u inventaru",
        variant: "destructive",
      });
      return;
    }
    
    // Spremi trenutno stanje UI da bi se izbjeglo treperenje
    setStampIssued(newState);
    
    try {
      setIsIssuingStamp(true);
      
      let apiSuccess = false;
      let updatedMember: Member | null = null; // Sigurnosna promjena: ispravan tip za ažuriranog člana
  
      if (newState) {
        // Poziv API-ja za izdavanje markice
        await api.post<{ member?: Member }>(`/members/${member.member_id}/stamp`, { forNextYear: false }); // Sigurnosna promjena: uklonjen unused var response
        apiSuccess = true;
  
        // Ažuriraj prikaz zalihe
        setInventoryStatus((prev) =>
          prev ? { ...prev, remaining: prev.remaining - 1 } : null
        );
      } else {
        // Poziv API-ja za vraćanje markice
        const response = await api.post<{ member?: Member }>(`/members/${member.member_id}/stamp/return`, { forNextYear: false }); // Sigurnosna promjena: tipiziran response
        
        // Pokušaj dobiti ažuriranog člana iz odgovora
        if (response.data?.member) {
          updatedMember = response.data.member; // Sigurnosna promjena: eksplicitni cast na Member
        }
        
        apiSuccess = true;
  
        // Ažuriraj prikaz zalihe
        setInventoryStatus((prev) =>
          prev ? { ...prev, remaining: prev.remaining + 1 } : null
        );
      }
  
      if (apiSuccess) {      
        // Stvori objekt za djelomično ažuriranje da bi se izbjeglo potpuno osvježavanje stranice
        const updatedData = {
          card_stamp_issued: newState,
          membership_details: {
            ...(member.membership_details || {}),
            card_stamp_issued: newState,
          }
        };
        
        // Prenesi podatke za ažuriranje roditeljskoj komponenti
        await onUpdate(updatedMember ?? { // Promjena: koristi ?? umjesto || zbog lint pravila
          ...member,
          ...updatedData
        });
        
        toast({
          title: "Uspjeh",
          description: newState ? "Markica je označena kao izdana" : "Markica je označena kao neizdana",
          variant: "success",
        });
      }
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error ? error.message : "Nije moguće ažurirati status markice",
        variant: "destructive",
      });
      // Vrati UI stanje ako poziv API-ja ne uspije
      setStampIssued(!newState);
    } finally {
      setIsIssuingStamp(false);
    }
  };

  // Upravljanje izdavanjem markice za sljedeću godinu
  const handleNextYearStampToggle = async (newState: boolean, userRole?: string) => {
    const canReturnStamp = userRole === "superuser";
    
    // Ako korisnik pokušava odznačiti markicu (vratiti u inventar), a nema dozvolu
    if (!newState && !canReturnStamp) {
      toast({
        title: "Nedovoljna prava",
        description: "Samo superadmin može vratiti markice u inventar",
        variant: "destructive",
      });
      return;
    }
    
    // Dohvati status zalihe za sljedeću godinu
    const nextYear = getCurrentYear() + 1;
    
    try {
      // Dohvati status inventara za sljedeću godinu (odvojeno od tekuće godine)
      let nextYearInventory: InventoryStatus | null = null;
      if (newState) {
        const response = await api.get(`/stamps/inventory/${nextYear}`);
        const stampType = getMemberStampType(member);
        
        // Tražimo odgovarajući inventar za tip markice i godinu
        // Definiramo tip koji odgovara raw API response-u
interface StampInventoryItem {
  stamp_type: string;
  stamp_year: number;
  remaining: number;
  // Uklonjen index signature zbog sigurnosti tipova
}

const foundInventory = (response.data as StampInventoryItem[]).find(
  (item) => item.stamp_type === stampType && item.stamp_year === nextYear
);

        
        // Ako je pronađen, pretvaramo ga u InventoryStatus
        if (foundInventory) {
          nextYearInventory = {
            type: foundInventory.stamp_type,
            remaining: foundInventory.remaining,
            year: foundInventory.stamp_year
          };
        }
        
        // Provjeri ima li dostupnih markica za sljedeću godinu
        if (!nextYearInventory || nextYearInventory.remaining <= 0) {
          toast({
            title: "Nedovoljan inventar",
            description: `Nema dostupnih markica za ${nextYear}. godinu. Molimo dodajte markice kroz Admin Dashboard.`,
            variant: "destructive",
          });
          return;
        }
      }
    
      // Spremi trenutno stanje UI da bi se izbjeglo treperenje
      setNextYearStampIssued(newState);
      
      setIsIssuingNextYearStamp(true);
      
      let apiSuccess = false;
      let updatedMember: Member | null = null; // Sigurnosna promjena: ispravan tip za ažuriranog člana
  
      if (newState) {
        // Poziv API-ja za izdavanje markice za sljedeću godinu
        await api.post<{ member?: Member }>(`/members/${member.member_id}/stamp`, { forNextYear: true }); // Sigurnosna promjena: uklonjen unused var response
        apiSuccess = true;
      } else {
        // Poziv API-ja za vraćanje markice za sljedeću godinu
        const response = await api.post<{ member?: Member }>(`/members/${member.member_id}/stamp/return`, { forNextYear: true }); // Sigurnosna promjena: tipiziran response
        
        // Pokušaj dobiti ažuriranog člana iz odgovora
        if (response.data?.member) {
          updatedMember = response.data.member; // Sigurnosna promjena: eksplicitni cast na Member
        }
        
        apiSuccess = true;
      }
  
      if (apiSuccess) {      
        // Stvori objekt za djelomično ažuriranje da bi se izbjeglo potpuno osvježavanje stranice
        const updatedData = {
          membership_details: {
            ...(member.membership_details || {}),
            next_year_stamp_issued: newState,
          }
        };
        
        // Prenesi podatke za ažuriranje roditeljskoj komponenti
        await onUpdate(updatedMember ?? { // Promjena: koristi ?? umjesto || zbog lint pravila
          ...member,
          ...updatedData
        });
        
        // Jasna poruka koja uključuje informaciju o godini
        toast({
          title: "Uspjeh!",
          description: newState 
            ? `Markica za ${nextYear}. godinu je izdana` 
            : `Markica za ${nextYear}. godinu je vraćena`,
          variant: "success",
        });
      }
    } catch (error) {
      toast({
        title: "Greška",
        description: error instanceof Error 
          ? error.message 
          : `Neuspješno ${newState ? "izdavanje" : "vraćanje"} markice za sljedeću godinu`,
        variant: "destructive",
      });
      // Vrati UI stanje ako poziv API-ja ne uspije
      setNextYearStampIssued(!newState);
    } finally {
      setIsIssuingNextYearStamp(false);
    }
  };

  return {
    stampIssued,
    nextYearStampIssued,
    isIssuingStamp,
    isIssuingNextYearStamp,
    inventoryStatus,
    nextYearInventoryStatus,
    handleStampToggle,
    handleNextYearStampToggle,
    getMemberStampType,
  };
};
