import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Activity, Mail, RefreshCw } from "lucide-react";
import { Member } from "@shared/member";
import { Button } from "@components/ui/button";
import { useToast } from "@components/ui/use-toast";
import { getAdminMessages, getStampHistory, resetStampInventory } from "@/utils/api";
import api from "../../utils/api";
import { getCurrentDate, getCurrentYear, formatDate } from "../../utils/dateUtils";

interface Props {
  member: Member;
}

interface InventoryData {
  stamp_type: "employed" | "student" | "pensioner";
  stamp_year: number;
  initial_count: number;
  issued_count: number;
  remaining: number;
}

interface StampTypeData {
  initial: number;
  issued: number;
  remaining: number;
}

interface YearlyInventory {
  employedStamps: StampTypeData;
  studentStamps: StampTypeData;
  pensionerStamps: StampTypeData;
}

interface StampInventory {
  [year: number]: YearlyInventory;
}

const AdminDashboard: React.FC<Props> = ({ member }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [inventory, setInventory] = useState<StampInventory>({});
  const [editValues, setEditValues] = useState<YearlyInventory>({
    employedStamps: { initial: 0, issued: 0, remaining: 0 },
    studentStamps: { initial: 0, issued: 0, remaining: 0 },
    pensionerStamps: { initial: 0, issued: 0, remaining: 0 },
  });
  const [unreadMessages, setUnreadMessages] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetYear, setResetYear] = useState(getCurrentYear());
  const [resetNotes, setResetNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [stampHistory, setStampHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [availableYears, setAvailableYears] = useState<number[]>([getCurrentYear(), getCurrentYear() + 1]);

  useEffect(() => {
    // Fetch immediately
    fetchInventory();
    checkUnreadMessages();

    // Ne osvježavaj automatski ako je korisnik u načinu uređivanja
    if (!isEditing) {
      // Refresh every 15 seconds
      const intervalId = setInterval(() => {
        fetchInventory();
        checkUnreadMessages();
      }, 15000);
    
      // Refresh when tab regains focus
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          fetchInventory();
          checkUnreadMessages();
        }
      };
    
      document.addEventListener("visibilitychange", handleVisibilityChange);
    
      // Cleanup
      return () => {
        clearInterval(intervalId);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
    }
    
    return () => {}; // Prazan return ako smo u načinu uređivanja
  }, [isEditing]); // Pokreni efekt ponovno kad se način uređivanja promijeni

  useEffect(() => {
    if (showHistory) {
      fetchStampHistory();
    }
  }, [showHistory]);

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

  const fetchInventory = async () => {
    try {
      const response = await api.get("/stamps/inventory");
      if (!response.data) throw new Error("Failed to fetch inventory");

      const data = response.data;
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
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to fetch inventory",
        variant: "destructive",
      });
    }
  };

  const checkUnreadMessages = async () => {
    try {
      const data = await getAdminMessages();
      setUnreadMessages(data.some((message) => message.status === "unread"));
    } catch (error) {
      console.error("Error checking messages:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to fetch messages",
        variant: "destructive",
      });
    }
  };

  const fetchStampHistory = async () => {
    try {
      setIsLoading(true);
      const data = await getStampHistory();
      setStampHistory(data);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to fetch stamp history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetInventory = async () => {
    try {
      setIsLoading(true);
      const result = await resetStampInventory(resetYear, resetNotes);
      
      toast({
        title: "Success",
        description: result.message || "Inventory reset successfully",
      });
      
      // Osvježi popis povijesti i inventar
      fetchInventory();
      if (showHistory) {
        fetchStampHistory();
      }
      
      // Zatvori dijalog
      setShowResetDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to reset inventory",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
      const valuesToSave = JSON.parse(JSON.stringify(editValues));
      
      console.log("Spremam inventar za godinu:", selectedYear, valuesToSave);
      
      // Prikaži povratnu informaciju da je spremanje u tijeku
      toast({
        title: "Spremanje",
        description: "Ažuriranje inventara markica u tijeku...",
        duration: 2000,
      });
      
      // Pripremi payload s eksplicitnim numeričkim vrijednostima
      const payload = {
        year: selectedYear,
        employed: Number(valuesToSave.employedStamps.initial),
        student: Number(valuesToSave.studentStamps.initial),
        pensioner: Number(valuesToSave.pensionerStamps.initial),
      };
      
      console.log("Šaljem podatke:", payload);
      
      const response = await api.put("/stamps/inventory", payload);

      console.log("Odgovor sa servera:", response.data);

      if (!response.data) throw new Error("Failed to update inventory");

      // Ažuriraj lokalno stanje s novim vrijednostima i napravimo ponovno dohvaćanje
      setIsEditing(false);
      
      // Prikaži jasnu povratnu informaciju o uspjehu
      toast({
        title: "Uspjeh!",
        description: `Inventar markica za godinu ${selectedYear} uspješno ažuriran`,
        variant: "success",
        duration: 3000,
      });
      
      // Ponovno dohvati inventar da osiguramo sinkronizaciju s bazom
      await fetchInventory();
    } catch (error) {
      console.error("Greška pri spremanju:", error);
      
      // Prikaži detaljnu povratnu informaciju o grešci
      toast({
        title: "Greška",
        description:
          error instanceof Error ? error.message : "Neuspješno ažuriranje inventara",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // Čuvaj posljednju vrijednost za input field
  const lastInputValue = React.useRef({
    employedStamps: 0,
    studentStamps: 0,
    pensionerStamps: 0
  });

  const handleInputChange = (type: keyof YearlyInventory, value: number) => {
    console.log(`Changing ${type} to:`, value);
    if (isNaN(value)) return;
    
    // Zapamti vrijednost u ref
    lastInputValue.current[type] = value;

    setEditValues((prev) => {
      // Duboka kopija objekta kako bi se izbjeglo neočekivano ponašanje
      const newState = JSON.parse(JSON.stringify(prev));
      
      // Ažuriraj konkretno polje
      newState[type].initial = value;
      newState[type].remaining = value - newState[type].issued;
      
      console.log("New state:", newState);
      return newState;
    });
  };
  
  // Funkcija za fokus/blur hendlanje
  const handleInputFocus = (type: keyof YearlyInventory) => {
    console.log(`Focus on ${type}`);
  };
  
  const handleInputBlur = (type: keyof YearlyInventory, value: number) => {
    console.log(`Blur on ${type}, value: ${value}`);
    // Osiguraj da vrijednost ostane ista i nakon blur eventa
    if (value !== lastInputValue.current[type]) {
      handleInputChange(type, lastInputValue.current[type]);
    }
  };

  return (
    <div className="p-6">
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg text-white p-6 mb-6">
        <h1 className="text-2xl font-bold mb-2">Welcome, {member.full_name}</h1>
        <p className="opacity-90">Admin Dashboard</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          onClick={() => navigate("/members")}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Member Management</h3>
            <Users className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-sm text-gray-600">
            Manage member accounts and permissions
          </p>
        </div>

        <div
          onClick={() => navigate("/activities")}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Activity Management</h3>
            <Activity className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-sm text-gray-600">Manage and monitor activities</p>
        </div>

        <div
          onClick={() => navigate("/messages")}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Messages</h3>
            <Mail className="h-5 w-5 text-purple-600" />
          </div>
          <p className="text-sm text-gray-600">
            {unreadMessages ? (
              <span className="text-red-600">There are unread messages</span>
            ) : (
              "No unread messages"
            )}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Stamp Inventory</h3>
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchInventory}
                className="p-1 h-8 w-8"
                title="Refresh inventory data"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              {!isEditing ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleEdit}>
                    Edit Inventory
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    {showHistory ? "Hide History" : "Show History"}
                  </Button>
                  {member.role === "superuser" && (
                    <Button 
                      variant="secondary" 
                      onClick={() => setShowResetDialog(true)}
                    >
                      Reset Year
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>Save Changes</Button>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between mb-4">
              <h3 className="font-medium">Select Year:</h3>
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
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800">
                Employed/Unemployed Members Stamps
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <div>
                  <label className="text-sm text-blue-600">Initial</label>
                  {isEditing ? (
                    <input
                      type="number"
                      min={editValues.employedStamps.issued}
                      value={editValues.employedStamps.initial}
                      onChange={(e) =>
                        handleInputChange(
                          "employedStamps",
                          e.target.valueAsNumber
                        )
                      }
                      onBlur={(e) => handleInputBlur("employedStamps", e.target.valueAsNumber)}
                      onFocus={handleInputFocus.bind(null, "employedStamps")}
                      className="w-full mt-1 p-1 border rounded"
                    />
                  ) : (
                    <p className="font-bold text-blue-700">
                      {inventory[selectedYear]?.employedStamps?.initial || 0}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-blue-600">Issued</label>
                  <p className="font-bold text-blue-700">
                    {inventory[selectedYear]?.employedStamps?.issued || 0}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-blue-600">Remaining</label>
                  <p className="font-bold text-blue-700">
                    {inventory[selectedYear]?.employedStamps?.remaining || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Student/Pupil Stamps */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-800">Student/Pupil Stamps</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <div>
                  <label className="text-sm text-green-600">Initial</label>
                  {isEditing ? (
                    <input
                      type="number"
                      min={editValues.studentStamps.issued}
                      value={editValues.studentStamps.initial}
                      onChange={(e) =>
                        handleInputChange(
                          "studentStamps",
                          e.target.valueAsNumber
                        )
                      }
                      onBlur={(e) => handleInputBlur("studentStamps", e.target.valueAsNumber)}
                      onFocus={handleInputFocus.bind(null, "studentStamps")}
                      className="w-full mt-1 p-1 border rounded"
                    />
                  ) : (
                    <p className="font-bold text-green-700">
                      {inventory[selectedYear]?.studentStamps?.initial || 0}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-green-600">Issued</label>
                  <p className="font-bold text-green-700">
                    {inventory[selectedYear]?.studentStamps?.issued || 0}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-green-600">Remaining</label>
                  <p className="font-bold text-green-700">
                    {inventory[selectedYear]?.studentStamps?.remaining || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Pensioner Stamps */}
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="font-medium text-red-800">Pensioner Stamps</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                <div>
                  <label className="text-sm text-red-600">Initial</label>
                  {isEditing ? (
                    <input
                      type="number"
                      min={editValues.pensionerStamps.issued}
                      value={editValues.pensionerStamps.initial}
                      onChange={(e) =>
                        handleInputChange(
                          "pensionerStamps",
                          e.target.valueAsNumber
                        )
                      }
                      onBlur={(e) => handleInputBlur("pensionerStamps", e.target.valueAsNumber)}
                      onFocus={handleInputFocus.bind(null, "pensionerStamps")}
                      className="w-full mt-1 p-1 border rounded"
                    />
                  ) : (
                    <p className="font-bold text-red-700">
                      {inventory[selectedYear]?.pensionerStamps?.initial || 0}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-red-600">Issued</label>
                  <p className="font-bold text-red-700">
                    {inventory[selectedYear]?.pensionerStamps?.issued || 0}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-red-600">Remaining</label>
                  <p className="font-bold text-red-700">
                    {inventory[selectedYear]?.pensionerStamps?.remaining || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showHistory && (
          <div className="col-span-2 mt-6 bg-white shadow rounded-lg overflow-hidden">
            <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">
                Stamp Inventory History
              </h2>
            </div>
            <div className="p-4">
              {isLoading ? (
                <div className="flex justify-center items-center h-24">
                  <p>Loading history...</p>
                </div>
              ) : stampHistory.length === 0 ? (
                <div className="text-center p-4 text-gray-500">
                  No history records found. History is created when inventory is reset for a new year.
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Year
                          </th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Initial
                          </th>
                          <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Issued
                          </th>
                          <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            By
                          </th>
                          <th className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Notes
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {stampHistory.map((record) => (
                          <tr key={record.id}>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.year}
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.stamp_type.charAt(0).toUpperCase() + record.stamp_type.slice(1)}
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.initial_count}
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {record.issued_count}
                            </td>
                            <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(record.reset_date)}
                            </td>
                            <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {record.reset_by_name}
                            </td>
                            <td className="hidden md:table-cell px-3 sm:px-6 py-4 text-sm text-gray-500">
                              {record.notes || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Mobile view for hidden columns */}
                  <div className="sm:hidden mt-4">
                    <p className="text-xs text-gray-500 italic">Swipe horizontally to see more details or rotate device to landscape mode.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {showResetDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Reset Stamp Inventory</h3>
            <p className="text-gray-600 mb-4">
              This will archive the current stamp inventory data and reset the issued counts 
              to zero for the new year. This action cannot be undone!
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year to Archive
              </label>
              <input
                type="number"
                value={resetYear}
                onChange={(e) => setResetYear(parseInt(e.target.value))}
                className="w-full p-2 border rounded"
                min="2020"
                max="2050"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={resetNotes}
                onChange={(e) => setResetNotes(e.target.value)}
                className="w-full p-2 border rounded"
                rows={3}
                placeholder="Add notes about this reset (e.g., reason, number of new stamps added)"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowResetDialog(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleResetInventory}
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Reset Inventory"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
