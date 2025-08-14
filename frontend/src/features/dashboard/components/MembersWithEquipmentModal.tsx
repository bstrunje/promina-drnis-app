import React, { useState, useEffect, useCallback } from 'react';
import { X, User, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@components/ui/use-toast';
import { getMembersWithEquipment } from '@/utils/api/apiMembers';
import { ApiMemberWithEquipment } from '@/utils/api/apiTypes';

interface MembersWithEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipmentType: string;
  size: string;
  gender: string;
}

export const MembersWithEquipmentModal: React.FC<MembersWithEquipmentModalProps> = ({
  isOpen,
  onClose,
  equipmentType,
  size,
  gender
}) => {
  const { toast } = useToast();
  const { t } = useTranslation(['dashboards', 'common']);
  const [members, setMembers] = useState<ApiMemberWithEquipment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Funkcija za dobivanje boja prema tipu opreme
  const getEquipmentColors = (type: string) => {
    switch (type) {
      case 'tshirt':
        return {
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-600'
        };
      case 'shell_jacket':
        return {
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          iconColor: 'text-green-600'
        };
      case 'hat':
        return {
          bgColor: 'bg-orange-100',
          textColor: 'text-orange-800',
          iconColor: 'text-orange-600'
        };
      default:
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          iconColor: 'text-gray-600'
        };
    }
  };

  const colors = getEquipmentColors(equipmentType);

  const fetchMembers = useCallback(async () => {
    try {
      setIsLoading(true);
      const membersData = await getMembersWithEquipment(equipmentType, size, gender);
      setMembers(membersData);
    } catch (error) {
      console.error('Error fetching members with equipment:', error);
      toast({
        title: t('common:error'),
        description: error instanceof Error ? error.message : t('equipmentInventory.errors.fetchMembers'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [equipmentType, size, gender, toast, t]);

  // Dohvati članove kada se modal otvori
  useEffect(() => {
    if (isOpen && equipmentType && size && gender) {
      void fetchMembers();
    }
  }, [isOpen, equipmentType, size, gender, fetchMembers]);

  // Zatvaranje modala na ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Funkcija za formatiranje spola
  const formatGender = (genderValue: string) => {
    return genderValue === 'male' ? 'M' : 'Ž';
  };

  // Funkcija za formatiranje naziva opreme
  const getEquipmentName = (type: string) => {
    switch (type) {
      case 'tshirt':
        return t('equipmentTypes.tshirt');
      case 'shell_jacket':
        return t('equipmentTypes.shell_jacket');
      case 'hat':
        return t('equipmentTypes.hat');
      default:
        return type;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className={`${colors.bgColor} ${colors.textColor} p-6 border-b flex items-center justify-between`}>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 ${colors.bgColor.replace('100', '200')} rounded-full flex items-center justify-center`}>
              <User className={`h-5 w-5 ${colors.iconColor}`} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                {t('equipmentInventory.membersWithEquipment.title')}
              </h2>
              <p className="text-sm opacity-90">
                {getEquipmentName(equipmentType)} {size}, Spol {formatGender(gender)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`${colors.textColor} hover:opacity-70 transition-opacity`}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">{t('common:loading')}</span>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {t('equipmentInventory.membersWithEquipment.noMembers')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  {t('equipmentInventory.membersWithEquipment.totalCount', { count: members.length })}
                </p>
              </div>
              
              {/* Prikaži prvih 5 članova odmah vidljivih */}
              <div className="space-y-3">
                {members.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between p-4 ${colors.bgColor} rounded-lg hover:opacity-80 transition-opacity`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 ${colors.bgColor.replace('100', '200')} rounded-full flex items-center justify-center`}>
                        <User className={`h-5 w-5 ${colors.iconColor}`} />
                      </div>
                      <div>
                        <p className={`font-medium ${colors.textColor}`}>
                          {member.first_name} {member.last_name}
                        </p>
                        <p className={`text-sm ${colors.textColor.replace('800', '600')}`}>
                          ID: {member.id}
                        </p>
                      </div>
                    </div>
                    
                    {member.card_number && (
                      <div className={`flex items-center space-x-2 text-sm ${colors.textColor.replace('800', '600')}`}>
                        <CreditCard className="h-4 w-4" />
                        <span>{member.card_number}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Skrolabilan dio za ostatak članova (ako ih ima više od 5) */}
              {members.length > 5 && (
                <div className="max-h-64 overflow-y-auto space-y-3 border-t pt-3">
                  {members.slice(5).map((member) => (
                    <div
                      key={member.id}
                      className={`flex items-center justify-between p-4 ${colors.bgColor} rounded-lg hover:opacity-80 transition-opacity`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 ${colors.bgColor.replace('100', '200')} rounded-full flex items-center justify-center`}>
                          <User className={`h-5 w-5 ${colors.iconColor}`} />
                        </div>
                        <div>
                          <p className={`font-medium ${colors.textColor}`}>
                            {member.first_name} {member.last_name}
                          </p>
                          <p className={`text-sm ${colors.textColor.replace('800', '600')}`}>
                            ID: {member.id}
                          </p>
                        </div>
                      </div>
                      
                      {member.card_number && (
                        <div className={`flex items-center space-x-2 text-sm ${colors.textColor.replace('800', '600')}`}>
                          <CreditCard className="h-4 w-4" />
                          <span>{member.card_number}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
