import React from "react";
import { MembershipPeriod, MembershipHistory } from "@shared/membership";
import { Member } from "@shared/member";
import { useAuth } from "../../context/AuthContext";
import MembershipPeriodsSection from "./components/MembershipPeriodsSection";

/**
 * Adapter za MembershipHistory komponentu koji koristi modularnu arhitekturu
 * 
 * Ovaj adapter omogućuje postupni prelazak s postojećeg MembershipHistory.tsx
 * na novu modularnu arhitekturu.
 */

// Zadržavamo originalno sučelje MembershipHistory komponente
interface MembershipHistoryAdapterProps {
  periods: MembershipPeriod[];
  memberId: number;
  feePaymentYear?: number;
  feePaymentDate?: string;
  totalDuration?: string;
  currentPeriod?: MembershipPeriod;
  onUpdate?: (periods: MembershipPeriod[]) => Promise<void>;
}

/**
 * MembershipHistoryAdapter - Adapter koji povezuje staro sučelje s novom implementacijom
 */
const MembershipHistoryAdapter: React.FC<MembershipHistoryAdapterProps> = ({
  periods,
  memberId,
  feePaymentYear,
  feePaymentDate,
  totalDuration,
  currentPeriod,
  onUpdate,
}) => {
  const { user } = useAuth();
  
  // Pripremamo minimalni Member objekt koji zadovoljava tipsko ograničenje
  const memberData: Member = {
    member_id: memberId,
    first_name: "", // Obavezna polja prema tipu
    last_name: "",
    date_of_birth: "",
    gender: "male", // Moramo postaviti default vrijednost
    street_address: "",
    city: "",
    oib: "",
    cell_phone: "",
    email: "",
    // Dodajemo članarske podatke koji nam trebaju
    membership_details: {
      fee_payment_date: feePaymentDate,
      fee_payment_year: feePaymentYear,
    },
    // Pravilno strukturiranje membership_history objekta
    membership_history: {
      periods: periods || [],
      total_duration: totalDuration,
      current_period: currentPeriod
    },
  };

  return (
    <MembershipPeriodsSection
      member={memberData}
      periods={periods || []}
      feePaymentYear={feePaymentYear}
      feePaymentDate={feePaymentDate}
      totalDuration={totalDuration}
      onUpdatePeriods={onUpdate}
      onUpdate={async () => {}} // Dummy funkcija - stvarno ažuriranje događa se kroz onUpdatePeriods
      userRole={user?.role}
    />
  );
};

export default MembershipHistoryAdapter;
