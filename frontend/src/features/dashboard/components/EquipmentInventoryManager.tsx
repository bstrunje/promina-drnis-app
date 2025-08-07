import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Package, Edit, Plus, Minus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@components/ui/button";
import { useToast } from "@components/ui/use-toast";
import { Member } from "@shared/member";
import apiInstance from "@/utils/api/apiConfig";

interface EquipmentInventoryItem {
  equipment_type: 'tshirt' | 'shell_jacket' | 'hat';
  size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';
  gender: 'male' | 'female';
  initial_count: number;
  issued_count: number;
  gift_count: number;
  remaining: number;
  total_distributed: number;
  last_updated: Date;
}

interface EquipmentInventoryManagerProps {
  member: Member;
}

// Sve moguće kombinacije za editiranje
const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const;
const ALL_GENDERS = ['male', 'female'] as const;
const EQUIPMENT_TYPES = ['tshirt', 'shell_jacket', 'hat'] as const;

// Size ordering for proper display
const SIZE_ORDER = { 'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, 'XXL': 6, 'XXXL': 7 };

/**
 * Komponenta za upravljanje inventarom opreme s tabbed interface-om
 */
export const EquipmentInventoryManager: React.FC<EquipmentInventoryManagerProps> = ({
  member
}) => {
  const { toast } = useToast();
  const { t } = useTranslation('dashboards');
  const [inventory, setInventory] = useState<EquipmentInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'tshirt' | 'shell_jacket' | 'hat'>('tshirt');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalTab, setEditModalTab] = useState<'tshirt' | 'shell_jacket' | 'hat'>('tshirt');
  const [editValues, setEditValues] = useState<Record<string, number>>({});

  // Dohvati inventar opreme
  const fetchInventory = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiInstance.get("/members/equipment/inventory");
      if (!response.data) throw new Error(t("equipmentDelivery.error"));
      
      setInventory(response.data);
    } catch (error) {
      console.error("Error fetching equipment inventory:", error);
      toast({
        title: t("equipmentDelivery.error"),
        description: error instanceof Error ? error.message : t("equipmentDelivery.error"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, t]);

  // Ažuriraj inventar
  const updateInventory = async (equipmentType: string, size: string, gender: string, initialCount: number) => {
    try {
      await apiInstance.put("/members/equipment/inventory", {
        equipment_type: equipmentType,
        size: size,
        gender: gender,
        initial_count: initialCount
      });
      
      return true;
    } catch (error) {
      console.error("Error updating equipment inventory:", error);
      throw error;
    }
  };

  // Otvori edit modal
  const handleEditModal = () => {
    // Inicijaliziraj edit values s trenutnim podacima
    const initialEditValues: Record<string, number> = {};
    
    // Dodaj postojeće vrijednosti
    inventory.forEach(item => {
      const key = `${item.equipment_type}-${item.size}-${item.gender}`;
      initialEditValues[key] = item.initial_count;
    });
    
    // Dodaj prazne vrijednosti za sve kombinacije koje ne postoje
    EQUIPMENT_TYPES.forEach(equipmentType => {
      ALL_SIZES.forEach(size => {
        ALL_GENDERS.forEach(gender => {
          const key = `${equipmentType}-${size}-${gender}`;
          if (!(key in initialEditValues)) {
            initialEditValues[key] = 0;
          }
        });
      });
    });
    
    setEditValues(initialEditValues);
    setEditModalTab(activeTab);
    setShowEditModal(true);
  };

  // Zatvori edit modal
  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditValues({});
  };

  // Spremi promjene iz modala
  const handleSaveModal = async () => {
    try {
      setIsLoading(true);
      
      const updatePromises: Promise<boolean>[] = [];
      
      // Update sve promijenjene vrijednosti
      Object.entries(editValues).forEach(([key, value]) => {
        const [equipmentType, size, gender] = key.split('-');
        const originalItem = inventory.find(item => 
          item.equipment_type === equipmentType && 
          item.size === size && 
          item.gender === gender
        );
        
        // Ažuriraj ako se vrijednost promijenila ili ako je nova kombinacija s vrijednošću > 0
        if ((originalItem && originalItem.initial_count !== value) || (!originalItem && value > 0)) {
          updatePromises.push(updateInventory(equipmentType, size, gender, value));
        }
      });
      
      await Promise.all(updatePromises);
      
      // Refresh inventory
      await fetchInventory();
      
      setShowEditModal(false);
      setEditValues({});
      
      toast({
        title: t("equipmentDelivery.success"),
        description: t("equipmentDelivery.successDescription"),
        variant: "default",
      });
    } catch (error) {
      console.error("Error saving equipment inventory:", error);
      toast({
        title: t("equipmentDelivery.error"),
        description: error instanceof Error ? error.message : t("equipmentDelivery.error"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change u modalu
  const handleInputChange = (key: string, value: number) => {
    setEditValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Dohvati inventar na početku
  useEffect(() => {
    void fetchInventory();
  }, [fetchInventory]);

  // Group inventory by equipment type
  const groupedInventory = inventory.reduce((acc, item) => {
    if (!acc[item.equipment_type]) {
      acc[item.equipment_type] = [];
    }
    acc[item.equipment_type].push(item);
    return acc;
  }, {} as Record<string, EquipmentInventoryItem[]>);

  const equipmentTypeLabels = {
    tshirt: t('equipmentDelivery.tShirt'),
    shell_jacket: t('equipmentDelivery.shellJacket'),
    hat: t('equipmentDelivery.hat')
  };

  // Dohvati podatke za trenutni tab
  const currentTabData = groupedInventory[activeTab] || [];

  // Sort by gender first, then by size within each gender
  const sortedCurrentTabData = currentTabData.sort((a, b) => {
    // Prvo grupirati po spolu: prvo ženske (female), zatim muške (male)
    if (a.gender !== b.gender) {
      return a.gender === 'female' ? -1 : 1;
    }
    // Zatim sortirati po veličini unutar istog spola
    const sizeOrderA = SIZE_ORDER[a.size as keyof typeof SIZE_ORDER] || 999;
    const sizeOrderB = SIZE_ORDER[b.size as keyof typeof SIZE_ORDER] || 999;
    return sizeOrderA - sizeOrderB;
  });

  // Generiraj sve kombinacije za edit modal
  const generateAllCombinations = (equipmentType: string) => {
    const combinations: Array<{
      key: string;
      equipmentType: string;
      size: string;
      gender: string;
      currentValue: number;
      existingItem?: EquipmentInventoryItem;
    }> = [];

    [...ALL_SIZES].sort((a, b) => SIZE_ORDER[a] - SIZE_ORDER[b]).forEach(size => {
      ALL_GENDERS.forEach(gender => {
        const key = `${equipmentType}-${size}-${gender}`;
        const existingItem = inventory.find(item => 
          item.equipment_type === equipmentType && 
          item.size === size && 
          item.gender === gender
        );
        
        combinations.push({
          key,
          equipmentType,
          size,
          gender,
          currentValue: editValues[key] ?? (existingItem?.initial_count || 0),
          existingItem
        });
      });
    });

    return combinations;
  };

  // Gift Equipment funkcija
  const incrementGift = async (item: EquipmentInventoryItem) => {
    try {
      setIsLoading(true);
      
      await apiInstance.post("/members/equipment/gift", {
        equipment_type: item.equipment_type,
        size: item.size,
        gender: item.gender,
        notes: `Gift increment via admin dashboard`
      });
      
      toast({
        title: t("equipmentInventory.giftActions.giftMarked"),
        description: t("equipmentInventory.giftActions.giftMarkedDescription", {
          equipmentType: t(`equipmentInventory.equipmentTypes.${item.equipment_type}`),
          size: item.size,
          gender: t(`equipmentInventory.gender.${item.gender}`)
        }),
        variant: "success",
      });
      
      // Refresh inventory
      await fetchInventory();
    } catch (error) {
      console.error("Error incrementing gift:", error);
      toast({
        title: t("equipmentInventory.giftActions.error"),
        description: error instanceof Error ? error.message : t("equipmentInventory.giftActions.giftMarkError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const decrementGift = async (item: EquipmentInventoryItem) => {
    try {
      setIsLoading(true);
      
      await apiInstance.delete("/members/equipment/gift", {
        data: {
          equipment_type: item.equipment_type,
          size: item.size,
          gender: item.gender,
          notes: `Gift decrement via admin dashboard`
        }
      });
      
      toast({
        title: t("equipmentInventory.giftActions.giftReturned"),
        description: t("equipmentInventory.giftActions.giftReturnedDescription", {
          equipmentType: t(`equipmentInventory.equipmentTypes.${item.equipment_type}`),
          size: item.size,
          gender: t(`equipmentInventory.gender.${item.gender}`)
        }),
        variant: "success",
      });
      
      // Refresh inventory
      await fetchInventory();
    } catch (error) {
      console.error("Error decrementing gift:", error);
      toast({
        title: t("equipmentInventory.giftActions.error"),
        description: error instanceof Error ? error.message : t("equipmentInventory.giftActions.giftReturnError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
          <div className="flex items-center">
            <Package className="h-5 w-5 mr-2 text-purple-600" />
            <h2 className="text-lg font-semibold">{t("equipmentInventory.title")}</h2>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchInventory()}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              {t("equipmentInventory.refresh")}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditModal}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              <Edit className="h-4 w-4 mr-1" />
              {t("equipmentInventory.editInventory")}
            </Button>
          </div>
        </div>

        {/* Equipment Type Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {EQUIPMENT_TYPES.map((equipmentType) => (
              <button
                key={equipmentType}
                onClick={() => setActiveTab(equipmentType)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === equipmentType
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {equipmentTypeLabels[equipmentType]}
              </button>
            ))}
          </nav>
        </div>

        {/* Current Tab Content */}
        <div>
          {sortedCurrentTabData.length > 0 ? (
            <>
              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-3">
                {sortedCurrentTabData.map((item) => (
                  <div key={`${item.equipment_type}-${item.size}-${item.gender}`} className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="font-medium text-lg">{item.size}</span>
                        <span className="ml-2 text-sm text-gray-500">
                        ({t(`equipmentInventory.gender.${item.gender}`)})
                        </span>
                      </div>
                      <span className={`text-lg font-bold ${item.remaining <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {item.remaining}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">{t("equipmentInventory.cardLabels.initial")}</span>
                        <div className="font-medium">{item.initial_count}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">{t("equipmentInventory.cardLabels.issued")}</span>
                        <div className="font-medium">{item.issued_count}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">{t("equipmentInventory.cardLabels.gifts")}</span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void decrementGift(item)}
                            disabled={isLoading}
                            className="w-6 h-6 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="font-semibold text-base px-2">{item.gift_count}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void incrementGift(item)}
                            disabled={isLoading}
                            className="w-6 h-6 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">{t("equipmentInventory.cardLabels.remaining")}</span>
                        <div className={`font-medium ${item.remaining <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {item.remaining}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("equipmentInventory.tableHeaders.size")}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("equipmentInventory.tableHeaders.gender")}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("equipmentInventory.tableHeaders.initial")}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("equipmentInventory.tableHeaders.issued")}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("equipmentInventory.tableHeaders.gifts")}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("equipmentInventory.tableHeaders.remaining")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedCurrentTabData.map((item) => (
                      <tr key={`${item.equipment_type}-${item.size}-${item.gender}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {item.size}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700">
                        {t(`equipmentInventory.gender.${item.gender}`)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {item.initial_count}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700">
                          {item.issued_count}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void decrementGift(item)}
                              disabled={isLoading}
                              className="w-6 h-6 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="font-semibold text-base px-2">{item.gift_count}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void incrementGift(item)}
                              disabled={isLoading}
                              className="w-6 h-6 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold">
                          <span className={`${item.remaining <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {item.remaining}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {t("equipmentInventory.noData", { equipmentType: equipmentTypeLabels[activeTab] })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">
                {t("equipmentInventory.modal.title", { 
                  equipmentType: equipmentTypeLabels[editModalTab] 
                })}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {generateAllCombinations(editModalTab).map(({ key, size, gender, existingItem }) => {
                  const currentValue = editValues[key] ?? (existingItem?.initial_count || 0);
                  
                  return (
                    <div key={key} className="border rounded-lg p-4 space-y-3">
                      <div className="font-medium text-center">
                        {size} - {t(`equipmentInventory.gender.${gender}`)}
                      </div>
                      
                      {existingItem && (
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>{t("equipmentInventory.cardLabels.issued")} {existingItem.issued_count}</div>
                          <div>{t("equipmentInventory.cardLabels.gifts")} {existingItem.gift_count}</div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">{t("equipmentInventory.cardLabels.initial")}</label>
                        <input
                          type="number"
                          min="0"
                          value={currentValue}
                          onChange={(e) => setEditValues(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                          className="w-20 px-2 py-1 border rounded text-sm"
                        />
                      </div>
                      
                      {existingItem && (
                        <div className="mt-2 text-sm">
                          <span className="text-gray-600">{t("equipmentInventory.cardLabels.remaining")} </span>
                          <span className={`font-medium ${
                            (currentValue - existingItem.issued_count - existingItem.gift_count) <= 0 
                              ? 'text-red-600' 
                              : 'text-green-600'
                          }`}>
                            {currentValue - existingItem.issued_count - existingItem.gift_count}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={handleCloseModal}>
                {t("equipmentInventory.modal.cancel")}
              </Button>
              <Button onClick={() => void handleSaveModal()} disabled={isLoading}>
                {isLoading ? t("common.saving") : t("equipmentInventory.modal.save")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
