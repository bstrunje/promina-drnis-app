import React, { useState, useEffect, useRef, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@components/ui/button";
import { useToast } from "@components/ui/use-toast";
import { Member } from "@shared/member";
import { StampTypeCard } from "./StampTypeCard";
import { ArchiveDialog } from "./ArchiveDialog";
import { StampHistorySection } from "./StampHistorySection";
import { MembersWithStampModal } from "./MembersWithStampModal";
import { StampInventory, YearlyInventory, InventoryData, StampHistoryItem, ArchiveResult } from "./types";
import apiInstance from "@/utils/api/apiConfig";
import { getCurrentYear } from "@/utils/dateUtils";
// Zamijenjeno prema novoj modularnoj API strukturi
import { getStampHistory, archiveStampInventory } from '@/utils/api/apiStamps';

interface StampInventoryManagerProps {
  member: Member;
  showHistory: boolean;
  setShowHistory: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Komponenta za upravljanje inventarom markica
 */
export const StampInventoryManager: React.FC<StampInventoryManagerProps> = ({
  member,
  showHistory,
  setShowHistory
}) => {
  const { toast } = useToast();
  const { t } = useTranslation(['dashboards', 'common']);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [inventory, setInventory] = useState<StampInventory>({});
  const [editValues, setEditValues] = useState<YearlyInventory>({
    employedStamps: { initial: 0, issued: 0, remaining: 0 },
    studentStamps: { initial: 0, issued: 0, remaining: 0 },
    pensionerStamps: { initial: 0, issued: 0, remaining: 0 },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [stampHistory, setStampHistory] = useState<StampHistoryItem[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([getCurrentYear(), getCurrentYear() + 1]);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  
  // State za modal s članovima
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedStampType, setSelectedStampType] = useState<'employed' | 'student' | 'pensioner'>('employed');
  const [selectedStampTypeName, setSelectedStampTypeName] = useState('');

  // Čuvaj posljednju vrijednost za input field
  const lastInputValue = useRef({
    employedStamps: 0,
    studentStamps: 0,
    pensionerStamps: 0
  });

  // Dohvati inventar markica
  const fetchInventory = useCallback(async () => {
    try {
      const response = await apiInstance.get("/stamps/inventory");
      if (!response.data) throw new Error("Failed to fetch inventory");

      const data = response.data as InventoryData[];
      const newInventory: StampInventory = {};
      const years = new Set<number>();
      
      // Grupiraj podatke po godinama
      data.forEach((item: InventoryData) => {
        const year = item.stamp_year;
        years.add(year);
        
        if (!newInventory[year]) {
          newInventory[year] = {
            employedStamps: { initial: 0, issued: 0, remaining: 0 },
            studentStamps: { initial: 0, issued: 0, remaining: 0 },
            pensionerStamps: { initial: 0, issued: 0, remaining: 0 },
          };
        }
        
        if (item.stamp_type === "employed") {
          newInventory[year].employedStamps = {
            initial: item.initial_count,
            issued: item.issued_count,
            remaining: item.remaining,
          };
        } else if (item.stamp_type === "student") {
          newInventory[year].studentStamps = {
            initial: item.initial_count,
            issued: item.issued_count,
            remaining: item.remaining,
          };
        } else if (item.stamp_type === "pensioner") {
          newInventory[year].pensionerStamps = {
            initial: item.initial_count,
            issued: item.issued_count,
            remaining: item.remaining,
          };
        }
      });
      
      // Osiguraj da postoje podaci za trenutnu i sljedeću godinu
      const currentYear = getCurrentYear();
      const nextYear = currentYear + 1;
      
      if (!newInventory[currentYear]) {
        newInventory[currentYear] = {
          employedStamps: { initial: 0, issued: 0, remaining: 0 },
          studentStamps: { initial: 0, issued: 0, remaining: 0 },
          pensionerStamps: { initial: 0, issued: 0, remaining: 0 },
        };
        years.add(currentYear);
      }
      
      if (!newInventory[nextYear]) {
        newInventory[nextYear] = {
          employedStamps: { initial: 0, issued: 0, remaining: 0 },
          studentStamps: { initial: 0, issued: 0, remaining: 0 },
          pensionerStamps: { initial: 0, issued: 0, remaining: 0 },
        };
        years.add(nextYear);
      }
      
      setAvailableYears(Array.from(years).sort());
      setInventory(newInventory);
      
      // Inicijaliziraj vrijednosti za odabranu godinu
      if (newInventory[selectedYear]) {
        setEditValues(newInventory[selectedYear]);
      }
    } catch (error) {
      toast({
        title: t("common:error"),
        description:
          error instanceof Error ? error.message : t("stampInventory.fetchInventoryError"),
        variant: "destructive",
      });
    }
  }, [selectedYear, toast, t]);

  // Dohvati povijest markica
  const fetchStampHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getStampHistory();
      setStampHistory(data as StampHistoryItem[]);
    } catch (error) {
      toast({
        title: t("common:error"),
        description:
          error instanceof Error ? error.message : t("stampInventory.fetchHistoryError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, t]);

  // Arhiviraj inventar
  const handleArchiveInventory = async (year: number, notes: string, force: boolean) => {
    try {
      setIsLoading(true);
      const result = await archiveStampInventory(year, notes, force) as ArchiveResult;
      
      toast({
        title: t("common:success"),
        description: result.message ?? t("stampInventory.archiveSuccess"),
      });
      
      // Osvježi popis povijesti i inventar
      await fetchInventory();
      if (showHistory) {
        await fetchStampHistory();
      }
      
      // Zatvori dijalog
      setShowArchiveDialog(false);
    } catch (error) {
      toast({
        title: t("common:error"),
        description:
          error instanceof Error ? error.message : t("stampInventory.archiveError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Funkcije za uređivanje inventara
  const handleEdit = () => {
    setEditValues(inventory[selectedYear]);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditValues(inventory[selectedYear]);
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      // Duboke kopije editValues za sigurnost
      const valuesToSave = JSON.parse(JSON.stringify(editValues)) as YearlyInventory;
      
      if (import.meta.env.DEV) console.log("Spremam inventar za godinu:", selectedYear, valuesToSave);
      
      // Prikaži povratnu informaciju da je spremanje u tijeku
      toast({
        title: t("common:saving"),
        description: t("stampInventory.updatingInventory"),
        duration: 2000,
      });
      
      // Pripremi payload s eksplicitnim numeričkim vrijednostima
      const payload = {
        year: selectedYear,
        employed: Number(valuesToSave.employedStamps.initial),
        student: Number(valuesToSave.studentStamps.initial),
        pensioner: Number(valuesToSave.pensionerStamps.initial),
      };
      
      if (import.meta.env.DEV) console.log("Šaljem podatke:", payload);
      
      const response = await apiInstance.put("/stamps/inventory", payload);

      if (import.meta.env.DEV) console.log("Odgovor sa servera:", response.data);

      if (!response.data) throw new Error(t("stampInventory.updateInventoryError"));

      // Ažuriraj lokalno stanje s novim vrijednostima i napravimo ponovno dohvaćanje
      setIsEditing(false);
      
      // Prikaži jasnu povratnu informaciju o uspjehu
      toast({
        title: t("common:success"),
        description: t("stampInventory.inventoryUpdated", { year: selectedYear }),
        variant: "success",
        duration: 3000,
      });
      
      // Ponovno dohvati inventar da osiguramo sinkronizaciju s bazom
      await fetchInventory();
    } catch (error) {
      if (import.meta.env.DEV) console.error("Greška pri spremanju:", error);
      
      // Prikaži detaljnu povratnu informaciju o grešci
      toast({
        title: t("common:error"),
        description:
          error instanceof Error ? error.message : t("stampInventory.updateInventoryFailed"),
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const handleInputChange = (type: keyof YearlyInventory, value: number) => {
    if (import.meta.env.DEV) console.log(`Changing ${type} to:`, value);
    if (isNaN(value)) return;
    
    // Zapamti vrijednost u ref
    lastInputValue.current[type] = value;

    setEditValues((prev) => {
      // Duboka kopija objekta kako bi se izbjeglo neočekivano ponašanje
      const newState = JSON.parse(JSON.stringify(prev)) as YearlyInventory;
      
      // Ažuriraj konkretno polje
      newState[type].initial = value;
      newState[type].remaining = value - newState[type].issued;
      
      if (import.meta.env.DEV) console.log("New state:", newState);
      return newState;
    });
  };
  
  // Funkcija za fokus/blur hendlanje
  const handleInputFocus = (type: keyof YearlyInventory) => {
    if (import.meta.env.DEV) console.log(`Focus on ${type}`);
  };
  
  const handleInputBlur = (type: keyof YearlyInventory, value: number) => {
    if (import.meta.env.DEV) console.log(`Blur on ${type}, value: ${value}`);
    // Osiguraj da vrijednost ostane ista i nakon blur eventa
    if (value !== lastInputValue.current[type]) {
      handleInputChange(type, lastInputValue.current[type]);
    }
  };

  // Handler za otvaranje modala s članovima
  const handleStampCardClick = (stampType: string) => {
    setSelectedStampType(stampType as 'employed' | 'student' | 'pensioner');
    
    // Postavi naziv tipa markice za prikaz u modalu
    const stampTypeNames = {
      'employed': t('stampInventory.stampTypes.employedUnemployed'),
      'student': t('stampInventory.stampTypes.studentPupil'),
      'pensioner': t('stampInventory.stampTypes.pensioner')
    };
    
    setSelectedStampTypeName(stampTypeNames[stampType as keyof typeof stampTypeNames] || stampType);
    setShowMembersModal(true);
  };

  // Efekt za dohvaćanje inventara
  useEffect(() => {
    // Fetch immediately
    void fetchInventory();

    // Ne osvježavaj automatski ako je korisnik u načinu uređivanja
    if (!isEditing) {
      // Refresh every 15 seconds
      const intervalId = setInterval(() => {
        void fetchInventory();
      }, 15000);
    
      // Refresh when tab regains focus
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          void fetchInventory();
        }
      };
    
      document.addEventListener("visibilitychange", handleVisibilityChange);
    
      // Cleanup
      return () => {
        clearInterval(intervalId);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }
    
    // Nema potrebe za čišćenjem ako smo u načinu uređivanja
    return undefined;
  }, [isEditing, fetchInventory]);

  // Efekt za dohvaćanje povijesti markica
  useEffect(() => {
    if (showHistory) {
      void fetchStampHistory();
    }
  }, [showHistory, fetchStampHistory]);

  // Efekt za inicijalizaciju vrijednosti za uređivanje
  useEffect(() => {
    // Kada se promijeni odabrana godina, inicijaliziraj početne vrijednosti za uređivanje
    if (inventory[selectedYear]) {
      setEditValues(inventory[selectedYear]);
    } else {
      setEditValues({
        employedStamps: { initial: 0, issued: 0, remaining: 0 },
        studentStamps: { initial: 0, issued: 0, remaining: 0 },
        pensionerStamps: { initial: 0, issued: 0, remaining: 0 },
      });
    }
  }, [selectedYear, inventory]);

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          {/* Sakrij naslov na malim ekranima */}
          <h3 className="font-medium hidden sm:block">{t("stampInventory.title")}</h3>
          <div className="flex flex-wrap gap-2 items-center">
            {/* Sakrij gumb za osvježavanje na malim ekranima */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void fetchInventory()}
              className="p-1 h-8 w-8 hidden sm:block" 
              title={t("stampInventory.refreshInventoryData")}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {!isEditing ? (
              <div className="flex flex-wrap gap-2">
                {/* Prikaži gumb samo ako je korisnik superuser */}
                {member.role === 'member_superuser' && (
                <Button 
                  variant="outline" 
                  onClick={handleEdit}
                  className="w-full sm:w-auto"
                >
                  {t("stampInventory.editInventory")}
                </Button>
              )}
              {/* Postavi punu širinu na malim ekranima, auto na većim */}
              <Button 
                variant="outline" 
                onClick={() => setShowHistory(!showHistory)}
                className="w-full sm:w-auto" 
              >
                {showHistory ? t("stampInventory.hideHistory") : t("stampInventory.showHistory")}
              </Button>
              {member.role === "member_superuser" && (
                <Button 
                  variant="secondary" 
                  onClick={() => setShowArchiveDialog(true)}
                  className="w-full sm:w-auto"
                >
                  {t("stampInventory.archiveYear")}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleCancel}>
                {t("stampInventory.cancel")}
              </Button>
              <Button onClick={() => void handleSave()}>{t("stampInventory.save")}</Button>
            </div>
          )}
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex justify-between mb-4">
          {/* Sakrij labelu na malim ekranima */}
          <h3 className="font-medium hidden sm:block">{t("stampInventory.selectYear")}</h3>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full p-2 border rounded"
              disabled={isEditing} // Onemogući promjenu godine tijekom uređivanja
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Status trake za način uređivanja */}
          {isEditing && (
            <div className="bg-amber-100 border border-amber-300 text-amber-800 p-3 rounded-lg mb-4 shadow-sm">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Način uređivanja aktivan</span>
              </div>
              <p className="text-sm mt-1">
                Unesite željene količine markica i kliknite "Spremi" za potvrdu promjena. Automatsko osvježavanje je privremeno zaustavljeno.
              </p>
            </div>
          )}

          {/* Employed/Unemployed Stamps */}
          <StampTypeCard
            title={t("stampInventory.stampTypes.employedUnemployed")}
            type="employedStamps"
            data={isEditing ? editValues.employedStamps : (inventory[selectedYear]?.employedStamps || { initial: 0, issued: 0, remaining: 0 })}
            bgColor="bg-blue-100"
            textColor="text-blue-800"
            isEditing={isEditing}
            onInputChange={handleInputChange}
            onInputBlur={handleInputBlur}
            onInputFocus={handleInputFocus}
            onCardClick={handleStampCardClick}
            year={selectedYear}
          />

          {/* Student/Pupil Stamps */}
          <StampTypeCard
            title={t("stampInventory.stampTypes.studentPupil")}
            type="studentStamps"
            data={isEditing ? editValues.studentStamps : (inventory[selectedYear]?.studentStamps || { initial: 0, issued: 0, remaining: 0 })}
            bgColor="bg-green-100"
            textColor="text-green-800"
            isEditing={isEditing}
            onInputChange={handleInputChange}
            onInputBlur={handleInputBlur}
            onInputFocus={handleInputFocus}
            onCardClick={handleStampCardClick}
            year={selectedYear}
          />

          {/* Pensioner Stamps */}
          <StampTypeCard
            title={t("stampInventory.stampTypes.pensioner")}
            type="pensionerStamps"
            data={isEditing ? editValues.pensionerStamps : (inventory[selectedYear]?.pensionerStamps || { initial: 0, issued: 0, remaining: 0 })}
            bgColor="bg-red-100"
            textColor="text-red-800"
            isEditing={isEditing}
            onInputChange={handleInputChange}
            onInputBlur={handleInputBlur}
            onInputFocus={handleInputFocus}
            onCardClick={handleStampCardClick}
            year={selectedYear}
          />
        </div>
      </div>

      {showHistory && (
        <StampHistorySection
          isLoading={isLoading}
          stampHistory={stampHistory}
        />
      )}

      <ArchiveDialog
        isOpen={showArchiveDialog}
        isLoading={isLoading}
        onClose={() => setShowArchiveDialog(false)}
        onArchive={handleArchiveInventory}
      />

      <MembersWithStampModal
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        stampType={selectedStampType}
        year={selectedYear}
        stampTypeName={selectedStampTypeName}
      />
    </>
  );
};
