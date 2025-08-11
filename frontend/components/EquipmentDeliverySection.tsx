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

// Dopuštene vrste opreme
type EquipmentType = 'tshirt' | 'shell_jacket' | 'hat';

// Tip lokalnog state-a za isporuku opreme
interface EquipmentDeliveryState {
  tshirt_delivered: boolean;
  shell_jacket_delivered: boolean;
  hat_delivered: boolean;
}

type IsUpdatingEquipment = Record<EquipmentType, boolean>;

const EquipmentDeliverySection: React.FC<EquipmentDeliverySectionProps> = ({
  member,
  onUpdate,
  isEditing = false,
}: EquipmentDeliverySectionProps) => {
  const { user } = useAuth();
  const { t } = useTranslation('dashboards');
  const { toast } = useToast();
  
  // Lokalni state za equipment delivery status (po uzoru na StampManagementSection)
  const [equipmentState, setEquipmentState] = useState<EquipmentDeliveryState>({
    tshirt_delivered: member?.tshirt_delivered ?? false,
    shell_jacket_delivered: member?.shell_jacket_delivered ?? false,
    hat_delivered: member?.hat_delivered ?? false,
  });
  
  const [isUpdatingEquipment, setIsUpdatingEquipment] = useState<IsUpdatingEquipment>({
    tshirt: false,
    shell_jacket: false,
    hat: false,
  });

  // Ažuriraj lokalni state kada se member prop promijeni
  useEffect(() => {
    setEquipmentState({
      tshirt_delivered: member?.tshirt_delivered ?? false,
      shell_jacket_delivered: member?.shell_jacket_delivered ?? false,
      hat_delivered: member?.hat_delivered ?? false,
    });
  }, [member?.tshirt_delivered, member?.shell_jacket_delivered, member?.hat_delivered]);

  // Role-based permissions
  const isOwnProfile = user?.member_id === member?.member_id;
  const isAdminOrSuperuser = user?.role === "member_administrator" || user?.role === "member_superuser";
  const canViewDetails = isOwnProfile || isAdminOrSuperuser;
  const canManageEquipment = isAdminOrSuperuser;

  // Equipment delivery toggle function
  const handleEquipmentToggle = async (equipmentType: EquipmentType, newState: boolean) => {
    try {
      setIsUpdatingEquipment((prev: IsUpdatingEquipment) => ({ ...prev, [equipmentType]: true }));
      // Izbjegni computed key zbog TS tipizacije – eksplicitno po ključevima
      setEquipmentState((prev: EquipmentDeliveryState) => {
        if (equipmentType === 'tshirt') {
          return { ...prev, tshirt_delivered: newState };
        }
        if (equipmentType === 'shell_jacket') {
          return { ...prev, shell_jacket_delivered: newState };
        }
        return { ...prev, hat_delivered: newState };
      });
      
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
    } catch (error: unknown) {
      console.error('Error updating equipment delivery:', error);

      setEquipmentState((prev: EquipmentDeliveryState) => {
        if (equipmentType === 'tshirt') {
          return { ...prev, tshirt_delivered: !newState };
        }
        if (equipmentType === 'shell_jacket') {
          return { ...prev, shell_jacket_delivered: !newState };
        }
        return { ...prev, hat_delivered: !newState };
      });
      
      // Izvuci poruku na siguran način
      const description = (() => {
        if (typeof error === 'object' && error !== null && 'response' in error) {
          const resp = (error as { response?: { data?: { message?: unknown } } }).response;
          if (typeof resp?.data?.message === 'string') return resp.data.message;
        }
        return `Failed to update ${equipmentType} delivery status`;
      })();

      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingEquipment((prev: IsUpdatingEquipment) => ({ ...prev, [equipmentType]: false }));
    }
  };

  // Equipment items configuration
  const equipmentItems: { type: EquipmentType; label: string; delivered: boolean }[] = [
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
                  onCheckedChange={(newState: boolean | 'indeterminate') => { void handleEquipmentToggle(type, newState === true); }}
                  disabled={isUpdatingEquipment[type] || 
                    (delivered && user?.role === 'member_administrator')}
                />
                <Label 
                  htmlFor={`${type}-delivery-checkbox-${isEditing ? 'edit' : 'view'}`} 
                  className="text-sm cursor-pointer"
                >
                  {label}
                  {isUpdatingEquipment[type] && (
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
