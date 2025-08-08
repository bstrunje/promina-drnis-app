import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { Member } from "@shared/member";
import { Label } from "@components/ui/label";
import { Checkbox } from "@components/ui/checkbox";
import { useAuth } from "../src/context/useAuth";
import { useToast } from "@components/ui/use-toast";
import api from "../src/utils/api/apiConfig";

interface EquipmentDeliverySectionProps {
  member: Member;
  onUpdate?: () => void;
  isEditing?: boolean;
  onMemberUpdate?: (updatedMember: Member) => void;
}

const EquipmentDeliverySection: React.FC<EquipmentDeliverySectionProps> = ({
  member,
  onUpdate,
  isEditing = false,
  onMemberUpdate,
}) => {
  const { user } = useAuth();
  const { t } = useTranslation('dashboards');
  const { toast } = useToast();
  
  // Lokalni state za equipment delivery status (po uzoru na StampManagementSection)
  const [equipmentState, setEquipmentState] = useState({
    tshirt_delivered: member?.tshirt_delivered || false,
    shell_jacket_delivered: member?.shell_jacket_delivered || false,
    hat_delivered: member?.hat_delivered || false,
  });
  
  const [isUpdatingEquipment, setIsUpdatingEquipment] = useState({
    tshirt: false,
    shell_jacket: false,
    hat: false,
  });

  // Ažuriraj lokalni state kada se member prop promijeni
  useEffect(() => {
    setEquipmentState({
      tshirt_delivered: member?.tshirt_delivered || false,
      shell_jacket_delivered: member?.shell_jacket_delivered || false,
      hat_delivered: member?.hat_delivered || false,
    });
  }, [member?.tshirt_delivered, member?.shell_jacket_delivered, member?.hat_delivered]);

  // Role-based permissions
  const isOwnProfile = user?.member_id === member?.member_id;
  const isAdminOrSuperuser = user?.role === "member_administrator" || user?.role === "member_superuser";
  const canViewDetails = isOwnProfile || isAdminOrSuperuser;
  const canManageEquipment = isAdminOrSuperuser;
  const canUndeliver = user?.role === "member_superuser";

  // Equipment delivery toggle function
  const handleEquipmentToggle = async (equipmentType: string, newState: boolean) => {
    try {
      setIsUpdatingEquipment(prev => ({ ...prev, [equipmentType]: true }));

      setEquipmentState(prev => ({
        ...prev,
        [`${equipmentType}_delivered`]: newState
      }));
      
      const endpoint = newState ? 'deliver' : 'undeliver';
      await api.post(`/members/${member.member_id}/equipment/${equipmentType}/${endpoint}`);
      
      toast({
        title: t('equipmentDelivery.success'),
        description: `${t(`equipmentTypes.${equipmentType}`)} ${newState ? t('equipmentDelivery.markAsDelivered') : t('equipmentDelivery.markAsUndelivered')}`,
        variant: "default",
      });
      
      // Refresh member data
      if (onUpdate) {
        onUpdate();
      }
    } catch (error: any) {
      console.error('Error updating equipment delivery:', error);

      setEquipmentState(prev => ({
        ...prev,
        [`${equipmentType}_delivered`]: !newState
      }));
      
      toast({
        title: "Error",
        description: error.response?.data?.message || `Failed to update ${equipmentType} delivery status`,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingEquipment(prev => ({ ...prev, [equipmentType]: false }));
    }
  };

  // Equipment items configuration
  const equipmentItems = [
    {
      type: 'tshirt',
      label: `${t('equipmentDelivery.tShirt')} ${t('equipmentDelivery.delivered')}`,
      delivered: equipmentState.tshirt_delivered,
    },
    {
      type: 'shell_jacket',
      label: `${t('equipmentDelivery.shellJacket')} ${t('equipmentDelivery.delivered')}`,
      delivered: equipmentState.shell_jacket_delivered,
    },
    {
      type: 'hat',
      label: `${t('equipmentDelivery.hat')} ${t('equipmentDelivery.delivered')}`,
      delivered: equipmentState.hat_delivered,
    },
  ];

  // Ne prikazuj komponentu ako nema member podataka ili korisnik ne može vidjeti detalje
  if (!member || !canViewDetails) {
    return null;
  }

  return (
    <div>
      <label className={`${isEditing ? 'block text-sm font-medium mb-3' : 'text-sm text-gray-500'}`}>
        {isEditing ? t('equipmentDelivery.management') : t('equipmentDelivery.status')}
      </label>
      <div className="space-y-2 mt-2">
        {equipmentItems.map(({ type, label, delivered }) => (
          <div key={type} className="flex items-center space-x-3">
            {canManageEquipment ? (
              <>
                <Checkbox 
                  id={`${type}-delivery-checkbox-${isEditing ? 'edit' : 'view'}`}
                  checked={delivered}
                  onCheckedChange={(newState) => handleEquipmentToggle(type, newState === true)}
                  disabled={isUpdatingEquipment[type as keyof typeof isUpdatingEquipment] || 
                    (delivered && user?.role === 'member_administrator')}
                />
                <Label 
                  htmlFor={`${type}-delivery-checkbox-${isEditing ? 'edit' : 'view'}`} 
                  className="text-sm cursor-pointer"
                >
                  {label}
                  {isUpdatingEquipment[type as keyof typeof isUpdatingEquipment] && (
                    <RefreshCw className="w-3 h-3 ml-2 inline animate-spin" />
                  )}
                </Label>
              </>
            ) : (
              /* Read-only prikaz za obične članove */
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-sm flex items-center justify-center mr-3 ${
                  delivered ? 'bg-black text-white' : 'border border-gray-300'
                }`}>
                  {delivered && '✓'}
                </div>
                <span className="text-sm">
                  {delivered ? label : label.replace(t('equipmentDelivery.delivered'), t('equipmentDelivery.notDelivered'))}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EquipmentDeliverySection;
