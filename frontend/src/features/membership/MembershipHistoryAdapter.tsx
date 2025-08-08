import React from "react";
import { MembershipPeriod } from "@shared/membership";
import { Member } from "@shared/member";
import { useAuth } from "../../context/useAuth";
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
  currentPeriod?: MembershipPeriod;
  onUpdate?: (member: Member) => Promise<void>;
  onUpdatePeriods?: (periods: MembershipPeriod[]) => Promise<void>;
}

/**
 * MembershipHistoryAdapter - Adapter koji povezuje staro sučelje s novom implementacijom
 */
const MembershipHistoryAdapter: React.FC<MembershipHistoryAdapterProps> = ({
  periods,
  memberId,
  feePaymentYear,
  feePaymentDate,
  currentPeriod,
  onUpdate,
  onUpdatePeriods,
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
      current_period: currentPeriod
    },
  };

  return (
    <MembershipPeriodsSection
      member={memberData}
      periods={periods ?? []} // Sigurnosna promjena: nullish coalescing za tipnu sigurnost
      feePaymentYear={feePaymentYear}
      feePaymentDate={feePaymentDate}
      onUpdatePeriods={onUpdatePeriods}
      onUpdate={onUpdate ?? (async () => Promise.resolve())} // dummy funkcija za tipnu kompatibilnost bez unused var
      userRole={user?.role}
    />
  );
};

export default MembershipHistoryAdapter;
