import { useState, useEffect, useCallback } from "react";
import { useToast } from "@components/ui/use-toast";
import { Member } from "@shared/member";
import { MembershipPeriod, MembershipEndReason } from "../types/membershipTypes";
import { getCurrentDate, getCurrentYear } from "../../../utils/dateUtils";
import { API_BASE_URL } from "../../../utils/config";
import { format, parseISO, isValid, isBefore, isAfter, addYears, parse, getMonth } from "date-fns";
import { useAuth } from "../../../context/AuthContext";
import { getCurrentDate } from '../utils/dateUtils';

export const useMembershipPeriods = (
  periods: MembershipPeriod[],
  memberId: number,
  feePaymentYear?: number,
  feePaymentDate?: string,
  onUpdate?: (periods: MembershipPeriod[]) => Promise<void>
) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedPeriods, setEditedPeriods] = useState<MembershipPeriod[]>(periods || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPeriod, setNewPeriod] = useState<Partial<MembershipPeriod> | null>(null);
  const [adminPermissions, setAdminPermissions] = useState<any | null>(null);

  const canEdit = user?.role === "superuser" || user?.role === "admin";
  const canManageEndReasons = 
    user?.role === 'superuser' || 
    (user?.role === 'admin' && adminPermissions?.can_manage_end_reasons);

  const canSeeEndReason = 
    user?.role === 'superuser' || 
    (user?.role === 'admin' && adminPermissions?.can_manage_end_reasons);

  // Izračunaj ukupno trajanje članstva
  const calculateTotalDuration = useCallback((periods: MembershipPeriod[]): string => {
    const totalDays = periods.reduce((total, period) => {
      const start = typeof period.start_date === 'string' ? parseISO(period.start_date) : period.start_date as Date;
      const end = period.end_date 
        ? (typeof period.end_date === 'string' ? parseISO(period.end_date) : period.end_date)
        : getCurrentDate();
      return (
        total +
        Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      );
    }, 0);

    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);
    const days = totalDays % 30;

    return `${years} years, ${months} months, ${days} days`;
  }, []);

  // Efekt za sinkronizaciju periods prop-a sa lokalnim stanjem
  useEffect(() => {
    setEditedPeriods(periods);
  }, [periods]);

  // Dohvati administratorske dozvole
  useEffect(() => {
    const fetchAdminPermissions = async () => {
      if (user?.role === 'admin') {
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
          const permissions = await response.json();
          setAdminPermissions(permissions);
        } catch (error) {
          console.error('Failed to fetch admin permissions:', error);
        }
      }
    };

    fetchAdminPermissions();
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
      await onUpdate(editedPeriods);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update periods:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Promjena vrijednosti perioda
  const handlePeriodChange = (
    index: number,
    field: keyof MembershipPeriod,
    value: string
  ) => {
    const updatedPeriods = [...editedPeriods];
    
    const periodToUpdate = updatedPeriods.find(
      p => p.period_id === editedPeriods[index].period_id
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
          p => p.period_id === periodToUpdate.period_id
        );

        updatedPeriods[periodIndex] = {
          ...periodToUpdate,
          [field]: null, // Postavi na null umjesto na prazan string
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
          const endDate = parse(periodToUpdate.end_date, "dd.MM.yyyy", getCurrentDate());
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
          const startDate = parse(periodToUpdate.start_date, "dd.MM.yyyy", getCurrentDate());
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
      
      // Konvertiraj u ISO format za spremanje u bazi, ali prikaži u HR formatu
      const isoDate = format(date, "yyyy-MM-dd");
      
      const periodIndex = updatedPeriods.findIndex(
        p => p.period_id === periodToUpdate.period_id
      );

      updatedPeriods[periodIndex] = {
        ...periodToUpdate,
        [field]: isoDate, // Spremamo u ISO formatu za backend
      };
    } else {
      // Za ostala polja
      const periodIndex = updatedPeriods.findIndex(
        p => p.period_id === periodToUpdate.period_id
      );

      updatedPeriods[periodIndex] = {
        ...periodToUpdate,
        [field]: value,
      };
    }

    setEditedPeriods(updatedPeriods);
  };

  // Upravljanje novim periodom
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
        
        // Konvertiraj u ISO format za spremanje
        const isoDate = format(date, "yyyy-MM-dd");
        
        setNewPeriod(prev => prev ? {
          ...prev,
          [field]: isoDate,
        } : null);
      } else {
        // Prazno polje je prihvatljivo za end_date
        setNewPeriod(prev => prev ? {
          ...prev,
          [field]: field === "end_date" ? null : '',
        } : null);
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
    setNewPeriod({
      start_date: getCurrentDate()formatDate(start_date: getCurrentDate(), 'yyyy-MM-dd\'T\'HH:mm:ss.SSS\'Z\'').split("T")[0],
      end_date: null,
    });
  };

  const handleSaveNewPeriod = () => {
    if (!newPeriod?.start_date) return;

    // Validacija datuma
    try {
      // Za startDate već imamo ISO format iz handleNewPeriodChange
      const startDate = typeof newPeriod.start_date === 'string' ? parseISO(newPeriod.start_date) : newPeriod.start_date as Date;
      
      let endDate = null;
      if (newPeriod.end_date) {
        // Za endDate također već imamo ISO format
        endDate = typeof newPeriod.end_date === 'string' ? parseISO(newPeriod.end_date as string) : newPeriod.end_date as Date;
        
        if (!isValid(startDate) || !isValid(endDate) || isAfter(startDate, endDate)) {
          toast({
            title: "Greška",
            description: "Neispravan raspon datuma", 
            variant: "destructive"
          });
          return;
        }
      }

      const updatedPeriods = [
        ...editedPeriods,
        {
          period_id: Math.floor(Math.random() * -1000),
          member_id: editedPeriods.length > 0 ? editedPeriods[0]?.member_id : memberId,
          start_date: newPeriod.start_date, // Već je u ISO formatu
          end_date: newPeriod.end_date || null, // Eksplicitno postavljanje na null
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
    if (!feePaymentYear || !feePaymentDate) return false;

    const currentYear = getCurrentYear();
    const paymentDate = parseISO(feePaymentDate);
    const paymentMonth = getMonth(paymentDate);

    return (
      feePaymentYear === currentYear ||
      (feePaymentYear === currentYear &&
        feePaymentYear === currentYear &&
        paymentMonth >= 10)
    );
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
    calculateTotalDuration,
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
