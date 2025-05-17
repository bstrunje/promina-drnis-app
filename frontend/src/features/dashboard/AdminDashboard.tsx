import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  const [unreadMessages, setUnreadMessages] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Dohvati nepročitane poruke
  const checkUnreadMessages = useCallback(async () => {
    try {
      // Dohvati poruke iz API-ja i eksplicitno konvertiraj u tip koji očekuje komponenta
      const apiMessages = await getAdminMessages();
      
      // Provjeri ima li nepročitanih poruka - koristimo as unknown pa as AdminMessage
      // kako bismo izbjegli TypeScript grešku o nekompatibilnim tipovima
      setUnreadMessages((apiMessages as unknown as AdminMessage[]).some((message) => message.status === "unread"));
    } catch (error) {
      console.error("Error checking messages:", error);
      toast({
        title: "Greška",
        description:
          error instanceof Error ? error.message : "Greška prilikom provjere poruka",
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
