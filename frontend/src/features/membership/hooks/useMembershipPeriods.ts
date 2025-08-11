import { useState, useEffect, useCallback } from "react";
import { useToast } from "@components/ui/use-toast";
// Uklonjeno: import { Member } from "@shared/member"; // nije korišteno
import { MembershipPeriod, MembershipEndReason } from "@shared/membership";
import { getCurrentDate, getCurrentYear } from "../../../utils/dateUtils";
import { API_BASE_URL } from "../../../utils/config";
import { format, parseISO, isValid, isBefore, isAfter, addYears, parse, getMonth } from "date-fns";
import { useAuth } from "../../../context/useAuth";
// import { useTranslation } from "react-i18next";

// Ispravno deklariran interface, koristi isključivo tipove
export interface UseMembershipPeriodsReturn {
  isEditing: boolean;
  editedPeriods: MembershipPeriod[];
  isSubmitting: boolean;
  newPeriod: Partial<MembershipPeriod> | null;
  canEdit: boolean;
  canManageEndReasons: boolean;
  canSeeEndReason: boolean;
  handleEndReasonChange: (periodId: number, reason: string) => void;
  handleEdit: () => void;
  handleCancel: () => void;
  handleSave: () => Promise<void>;
  handlePeriodChange: (periodId: number, field: keyof MembershipPeriod, value: string) => void;
  handleNewPeriodChange: (field: keyof MembershipPeriod, value: string) => void;
  handleAddPeriod: () => void;
  handleSaveNewPeriod: () => Promise<void>;
  formatFeePaymentInfo: (year: number, date: string) => string;
  isCurrentMembershipActive: () => boolean;
  getMembershipType: () => string;
  setNewPeriod: React.Dispatch<React.SetStateAction<Partial<MembershipPeriod> | null>>;
}

export const useMembershipPeriods = (
  periods: MembershipPeriod[],
  memberId: number,
  feePaymentYear?: number,
  feePaymentDate?: string,
  onUpdate?: (periods: MembershipPeriod[]) => Promise<void>
) => {
  // const { t } = useTranslation(); // nije korišteno
  const { toast } = useToast();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedPeriods, setEditedPeriods] = useState<MembershipPeriod[]>(periods ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPeriod, setNewPeriod] = useState<Partial<MembershipPeriod> | null>(null);
  
  // Pomoćna funkcija: normalizira različite ulazne formate datuma na ISO-8601 (UTC ponoć)
  // Prihvaća: "dd.MM.yyyy", "yyyy-MM-dd" ili već ISO string i vraća "yyyy-MM-dd'T'00:00:00.000'Z'"
  const toIsoMidnight = (dateStr: string): string => {
    try {
      if (!dateStr) return dateStr;
      let d: Date;
      // dd.MM.yyyy
      if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
        d = parse(dateStr, "dd.MM.yyyy", getCurrentDate());
      } else {
        // parseISO pokriva i "yyyy-MM-dd" i već ISO stringove
        d = parseISO(dateStr);
      }
      if (!isValid(d)) return dateStr;
      return format(d, "yyyy-MM-dd'T'00:00:00.000'Z'");
    } catch {
      // Ako dođe do greške, vrati original (backend će validirati)
      return dateStr;
    }
  };
  // adminPermissions tipiziran prema očekivanom obliku s can_manage_end_reasons
interface MemberPermissions {
  can_manage_end_reasons: boolean;
}
const [memberPermissions, setMemberPermissions] = useState<MemberPermissions | null>(null);

  const canEdit = user?.role === "member_superuser" || user?.role === "member_administrator";
  const canManageEndReasons = 
    user?.role === 'member_superuser' || 
    (user?.role === 'member_administrator' && memberPermissions?.can_manage_end_reasons);

  const canSeeEndReason = 
    user?.role === 'member_superuser' || 
    (user?.role === 'member_administrator' && memberPermissions?.can_manage_end_reasons);

  // Efekt za sinkronizaciju periods prop-a sa lokalnim stanjem
  useEffect(() => {
    setEditedPeriods(periods);
  }, [periods]);

  // Dohvati ovlasti za članove administratore
  useEffect(() => {
    const fetchMemberPermissions = async () => {
      if (user?.role === 'member_administrator') {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(
            `${API_BASE_URL}/admin/permissions/${user.member_id}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );
                    // TypeScript: response.json() vraća any, pa je potreban dvostruki cast na unknown pa na MemberPermissions radi tipne sigurnosti
const permissions = (await response.json()) as unknown as MemberPermissions;
          // Backend bi uvijek trebao vratiti { can_manage_end_reasons: boolean }, ali fallback osigurava tipnu sigurnost
          setMemberPermissions(
            permissions && typeof permissions.can_manage_end_reasons === 'boolean'
              ? permissions
              : { can_manage_end_reasons: false }
          );
        } catch (error) {
          console.error('Failed to fetch member permissions:', error);
        }
      }
    };

    void fetchMemberPermissions(); // Sigurnosna promjena: void za no-floating-promises
  }, [user]);

  // Promjena razloga završetka perioda
  const handleEndReasonChange = useCallback(async (periodId: number, newReason: string) => {
    try {
      await fetch(
        `${API_BASE_URL}/members/${memberId}/membership-periods/${periodId}/end-reason`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            endReason: newReason,
          }),
        }
      );

      // Ažuriraj lokalno stanje
      const updatedPeriods = editedPeriods.map(p =>
        p.period_id === periodId 
          ? { ...p, end_reason: newReason as MembershipEndReason }
          : p
      );
      
      setEditedPeriods(updatedPeriods);

      // Obavijesti parent komponentu
      if (onUpdate) {
        await onUpdate(updatedPeriods);
      }

      toast({
        title: "Uspjeh",
        description: "End reason updated successfully",
        variant: "success"
      });

    } catch (error) {
      console.error(error);
      toast({
        title: "Greška",
        description: "Failed to update end reason",
        variant: "destructive"
      });
    }
  }, [memberId, onUpdate, editedPeriods, toast]);

  // Upravljanje uređivanjem perioda
  const handleEdit = () => {
    setEditedPeriods(periods);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedPeriods(periods);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!onUpdate) return;
    setIsSubmitting(true);
    try {
      // Normalizacija datuma prije slanja backendu
      const normalized = editedPeriods.map(p => ({
        ...p,
        start_date: typeof p.start_date === 'string' ? toIsoMidnight(p.start_date) : p.start_date,
        // U hooku koristimo undefined umjesto null radi TS tipova; API sloj kasnije pretvara u null
        end_date: p.end_date ? (typeof p.end_date === 'string' ? toIsoMidnight(p.end_date) : p.end_date) : undefined,
      }));
      await onUpdate(normalized);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update periods:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Promjena vrijednosti perioda
  // Sigurnosna promjena: provjeri tip periodToUpdate prije pristupa njegovim svojstvima
  // Sigurnosna promjena: eksplicitno tipizirani handler za promjenu perioda
  const handlePeriodChange = (
    periodId: number,
    field: keyof MembershipPeriod,
    value: string
  ) => {
    const updatedPeriods = [...editedPeriods];
    
    const periodToUpdate = updatedPeriods.find(
      p => p.period_id === periodId
    );

    if (!periodToUpdate) {
      console.error('Period not found');
      return;
    }

    if (field === "start_date" || field === "end_date") {
      // Za datume u hrvatskom formatu (DD.MM.YYYY)
      
      // Poseban slučaj za prazno polje end_date - postaviti na null za aktivne periode
      if (field === "end_date" && value === "") {
        const periodIndex = updatedPeriods.findIndex(
          p => p.period_id === periodId
        );

        updatedPeriods[periodIndex] = {
          ...periodToUpdate,
          [field]: undefined,
        };
        
        setEditedPeriods([...updatedPeriods]);
        return;
      }
      
      const date = parse(value, "dd.MM.yyyy", getCurrentDate());
      
      if (!isValid(date)) {
        console.error('Invalid date format. Please use DD.MM.YYYY');
        return;
      }

      if (field === "start_date") {
        if (isAfter(date, getCurrentDate())) {
          toast({
            title: "Greška",
            description: "Datum početka ne može biti u budućnosti",
            variant: "destructive"
          });
          return;
        }
        if (periodToUpdate.end_date && typeof periodToUpdate.end_date === 'string') {
          const endDate = parseISO(periodToUpdate.end_date);
          if (isAfter(date, endDate)) {
            toast({
              title: "Greška",
              description: "Datum početka mora biti prije datuma završetka",
              variant: "destructive"
            });
            return;
          }
        }
      } else if (field === "end_date") {
        if (typeof periodToUpdate.start_date === 'string') {
          const startDate = parseISO(periodToUpdate.start_date);
          if (isBefore(date, startDate)) {
            toast({
              title: "Greška", 
              description: "Datum završetka mora biti nakon datuma početka",
              variant: "destructive"
            });
            return;
          }
        }
        if (isAfter(date, addYears(getCurrentDate(), 100))) {
          toast({
            title: "Greška",
            description: "Datum završetka je predaleko u budućnosti",
            variant: "destructive"
          });
          return;
        }
      }
      
      // Konvertiraj u ISO format s UTC ponoć za spremanje u bazi (RFC3339)
      const isoDate = format(date, "yyyy-MM-dd'T'00:00:00.000'Z'");
      
      const periodIndex = updatedPeriods.findIndex(
        p => p.period_id === periodId
      );

      updatedPeriods[periodIndex] = {
        ...periodToUpdate,
        [field]: isoDate, // Spremamo u ISO formatu za backend
      };
    } else {
      // Za ostala polja
      const periodIndex = updatedPeriods.findIndex(
        p => p.period_id === periodId
      );

      updatedPeriods[periodIndex] = {
        ...periodToUpdate,
        [field]: value,
      };
    }

    setEditedPeriods(updatedPeriods);
  };

  // Upravljanje novim periodom
  // Sigurnosna promjena: provjeri tip newPeriod prije pristupa njegovim svojstvima
  // Sigurnosna promjena: eksplicitno tipizirani handler za promjenu novog perioda
  const handleNewPeriodChange = (
    field: keyof MembershipPeriod,
    value: string
  ) => {
    if (!newPeriod) return;

    if (field === "start_date" || field === "end_date") {
      // Za datume u hrvatskom formatu
      if (value) {
        const date = parse(value, "dd.MM.yyyy", getCurrentDate());
        if (!isValid(date)) {
          toast({
            title: "Greška",
            description: "Neispravan format datuma. Koristite DD.MM.YYYY",
            variant: "destructive"
          });
          return;
        }
        
        // Konvertiraj u ISO format s UTC ponoć za spremanje (RFC3339)
        const isoDate = format(date, "yyyy-MM-dd'T'00:00:00.000'Z'");
        
        setNewPeriod(prev => prev ? {
          ...prev,
          [field]: isoDate,
        } : null);
      } else {
        // Prazno polje je prihvatljivo za end_date
        setNewPeriod(prev => {
          if (!prev) return null;
          
          // Ako brišemo end_date, brišemo i end_reason
          const updates: Partial<MembershipPeriod> = { [field]: undefined };
          if (field === 'end_date') {
            updates.end_reason = undefined;
          }
          
          return { ...prev, ...updates };
        });
      }
    } else {
      // Za ostala polja
      setNewPeriod(prev => prev ? {
        ...prev,
        [field]: value,
      } : null);
    }
  };

  const handleAddPeriod = () => {
    const today = getCurrentDate();
    const formattedIso = toIsoMidnight(format(today, "yyyy-MM-dd"));
    
    setNewPeriod({
      start_date: formattedIso,
      end_date: undefined,
      end_reason: undefined,
    });
  };

  const handleSaveNewPeriod = () => {
    if (!newPeriod?.start_date) {
      toast({
        title: "Greška",
        description: "Datum početka je obavezan",
        variant: "destructive"
      });
      return;
    }

    // Validacija datuma
    try {
      // Parse start date
      const startDate = parseISO(newPeriod.start_date ?? '');
      
      if (!isValid(startDate)) {
        toast({
          title: "Greška",
          description: "Neispravan datum početka",
          variant: "destructive"
        });
        return;
      }
      
      let endDate: Date | null = null;
      if (newPeriod.end_date) {
        // Ako postoji datum završetka, mora postojati i razlog
        if (!newPeriod.end_reason) {
          toast({
            title: "Greška",
            description: "Molimo odaberite razlog završetka članstva",
            variant: "destructive"
          });
          return;
        }

        // Parse end date
        endDate = parseISO(newPeriod.end_date ?? '');
        
        if (!isValid(endDate)) {
          toast({
            title: "Greška",
            description: "Neispravan datum završetka",
            variant: "destructive"
          });
          return;
        }
        
        if (isAfter(startDate, endDate)) {
          toast({
            title: "Greška",
            description: "Datum završetka ne može biti prije datuma početka",
            variant: "destructive"
          });
          return;
        }
      }

      // Normalizacija unosa prije dodavanja u stanje
      const updatedPeriods = [
        ...editedPeriods,
        {
          period_id: Date.now(), // privremeni lokalni ID
          member_id: editedPeriods.length > 0 ? editedPeriods[0]?.member_id : memberId,
          start_date: typeof newPeriod.start_date === 'string' ? toIsoMidnight(newPeriod.start_date) : newPeriod.start_date,
          end_date: newPeriod.end_date ? (typeof newPeriod.end_date === 'string' ? toIsoMidnight(newPeriod.end_date) : newPeriod.end_date) : undefined,
          end_reason: newPeriod.end_reason,
        } as MembershipPeriod,
      ];

      setEditedPeriods(updatedPeriods);
      setNewPeriod(null);
    } catch (error) {
      console.error("Error saving new period:", error);
      toast({
        title: "Greška",
        description: "Došlo je do greške prilikom dodavanja perioda",
        variant: "destructive"
      });
    }
  };

  // Formatiranje informacija o plaćanju članarine
  const formatFeePaymentInfo = (year?: number, date?: string): string => {
    if (!year || !date) return "No payment information available";

    const paymentDate = parseISO(date);
    const paymentMonth = getMonth(paymentDate);

    if (paymentMonth >= 10) {
      return `Payment for ${year} (next year) - paid on ${format(paymentDate, "dd.MM.yyyy")}`;
    } else {
      return `Payment for ${year} (current year) - paid on ${format(paymentDate, "dd.MM.yyyy")}`;
    }
  };

  // Provjeri je li trenutno članstvo aktivno
  const isCurrentMembershipActive = (): boolean => {
    // Uvjet 1: Provjeri postoji li aktivan period članstva (bez datuma završetka)
    const hasActivePeriod = editedPeriods.some(period => !period.end_date);

    if (!hasActivePeriod) {
      return false;
    }

    // Uvjet 2: Provjeri je li članarina plaćena za tekuću godinu
    if (!feePaymentYear) {
      return false;
    }

    const currentYear = getCurrentYear();
    const isFeePaidForCurrentYear = feePaymentYear === currentYear;

    return isFeePaidForCurrentYear;
  };


  // Dobijanje tipa članstva
  const getMembershipType = (): string => {
    if (!feePaymentYear || !feePaymentDate) return "Unknown";

    const paymentDate = parseISO(feePaymentDate);
    const paymentMonth = getMonth(paymentDate);
    const currentYear = getCurrentYear();

    if (paymentMonth >= 10 && feePaymentYear === currentYear + 1) {
      return "Renewed membership";
    } else if (feePaymentYear === currentYear) {
      return "New membership";
    } else {
      return "Past membership";
    }
  };

  return {
    isEditing,
    editedPeriods,
    isSubmitting,
    newPeriod,
    canEdit,
    canManageEndReasons,
    canSeeEndReason,
    handleEndReasonChange,
    handleEdit,
    handleCancel,
    handleSave,
    handlePeriodChange,
    handleNewPeriodChange,
    handleAddPeriod,
    handleSaveNewPeriod,
    formatFeePaymentInfo,
    isCurrentMembershipActive,
    getMembershipType,
    setNewPeriod
  };
};
