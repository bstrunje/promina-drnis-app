import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Member } from "@shared/member";
import { useToast } from "@components/ui/use-toast";
// Zamijenjeno prema novoj modularnoj API strukturi
import { getAdminMessages } from '@/utils/api/apiMessages';
import { AdminMessage } from "./components/types";

// Uvoz komponenti
import { DashboardHeader } from "./components/DashboardHeader";
import { DashboardNavCards } from "./components/DashboardNavCards";
import { StampInventoryManager } from "./components/StampInventoryManager";

interface Props {
  member: Member;
}

/**
 * Glavna komponenta Admin Dashboarda
 * Refaktorirana verzija koja koristi manje, specijalizirane komponente
 */
const AdminDashboard: React.FC<Props> = ({ member }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
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
        title: t("common.error"),
        description:
          error instanceof Error ? error.message : t("dashboard.errors.errorCheckingMessages"),
        variant: "destructive",
      });
    }
  }, [toast]);
  
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
    <div className="p-6">
      <DashboardHeader member={member} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DashboardNavCards 
          navigate={navigate} 
          unreadMessages={unreadMessages} 
        />
        
        <StampInventoryManager 
          member={member} 
          showHistory={showHistory}
          setShowHistory={setShowHistory}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
