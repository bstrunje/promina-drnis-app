import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Member } from "@shared/member";
import { useToast } from "@components/ui/use-toast";
// Zamijenjeno prema novoj modularnoj API strukturi
import { getAdminMessages } from '@/utils/api/apiMessages';
import { useTenantNavigation } from '@/hooks/useTenantNavigation';

// Uvoz komponenti
import { DashboardHeader } from "./components/DashboardHeader";
import { DashboardNavCards } from "./components/DashboardNavCards";
import { StampInventoryManager } from "./components/StampInventoryManager";
import { EquipmentInventoryManager } from "./components/EquipmentInventoryManager";

interface Props {
  member: Member;
}

/**
 * Glavna komponenta Admin Dashboarda
 * Refaktorirana verzija koja koristi manje, specijalizirane komponente
 */
const AdminDashboard: React.FC<Props> = ({ member }) => {
  const { navigateTo } = useTenantNavigation();
  const { toast } = useToast();
  const { t } = useTranslation(['dashboards', 'common']);
  const [unreadMessages, setUnreadMessages] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Dohvati nepročitane poruke
  const checkUnreadMessages = useCallback(async () => {
    try {
      // Dohvati poruke iz API-ja i eksplicitno konvertiraj u tip koji očekuje komponenta
      // Postavljamo forceLoad=true jer je korisnik aktivno na admin dijelu aplikacije
      const apiMessages = await getAdminMessages(true);
      
      // Provjeri ima li nepročitanih poruka - koristimo read polje koje je dodano u backend mapperu
      // Ako je read === false, poruka je nepročitana
      setUnreadMessages(apiMessages.some((message) => message.read === false));
    } catch (error) {
      console.error("Error checking messages:", error);
      toast({
        title: t("common:error"),
        description:
          error instanceof Error ? error.message : t("errors.errorCheckingMessages"),
        variant: "destructive",
      });
    }
  }, [toast, t]);
  
  // Efekt za dohvaćanje nepročitanih poruka
  useEffect(() => {
    // Dohvati odmah na početku
    void checkUnreadMessages();
    
    // Postavi interval za periodičko dohvaćanje
    const intervalId = setInterval(() => {
      void checkUnreadMessages();
    }, 15000);
    
    // Dohvati kada se tab ponovno aktivira
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkUnreadMessages();
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // Čišćenje
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkUnreadMessages]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <DashboardHeader member={member} />
      
      {/* Navigation Cards - First Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <DashboardNavCards 
          navigateTo={navigateTo} 
          unreadMessages={unreadMessages} 
        />
      </div>
      
      {/* Inventory Management - Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StampInventoryManager 
          member={member} 
          showHistory={showHistory}
          setShowHistory={setShowHistory}
        />
        
        <EquipmentInventoryManager member={member} />
      </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
