import React, { useState, useEffect, useCallback } from 'react';
import { X, User, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@components/ui/button';
import { useToast } from '@components/ui/use-toast';
import { getMembersWithStamp } from '@/utils/api/apiStamps';
import { ApiMemberWithStamp } from '@/utils/api/apiTypes';

interface MembersWithStampModalProps {
  isOpen: boolean;
  onClose: () => void;
  stampType: 'employed' | 'student' | 'pensioner';
  year: number;
  stampTypeName: string;
}

/**
 * Modal za prikaz članova kojima je izdana određena markica
 */
export const MembersWithStampModal: React.FC<MembersWithStampModalProps> = ({
  isOpen,
  onClose,
  stampType,
  year,
  stampTypeName
}) => {
  const { t } = useTranslation(['dashboards', 'common']);
  const { toast } = useToast();
  const [members, setMembers] = useState<ApiMemberWithStamp[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Funkcija za određivanje boja prema tipu markice
  const getStampColors = (type: 'employed' | 'student' | 'pensioner') => {
    switch (type) {
      case 'employed':
        return {
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-600'
        };
      case 'student':
        return {
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          iconColor: 'text-green-600'
        };
      case 'pensioner':
        return {
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          iconColor: 'text-red-600'
        };
      default:
        return {
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          iconColor: 'text-blue-600'
        };
    }
  };

  const colors = getStampColors(stampType);

  const fetchMembers = useCallback(async () => {
    try {
      setIsLoading(true);
      const membersData = await getMembersWithStamp(stampType, year);
      setMembers(membersData);
    } catch (error) {
      console.error('Error fetching members with stamps:', error);
      toast({
        title: t('common:error'),
        description: error instanceof Error ? error.message : t('stampInventory.errors.fetchMembers'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [stampType, year, toast, t]);

  // Dohvati članove kada se modal otvori
  useEffect(() => {
    if (isOpen && stampType && year) {
      void fetchMembers();
    }
  }, [isOpen, stampType, year, fetchMembers]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${colors.bgColor}`}>
          <div className="flex items-center space-x-3">
            <User className={`h-6 w-6 ${colors.iconColor}`} />
            <div>
              <h2 className={`text-xl font-semibold ${colors.textColor}`}>
                {t('stampInventory.membersWithStamp.title')}
              </h2>
              <p className={`text-sm ${colors.textColor.replace('800', '700')}`}>
                {stampTypeName} - {year}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">{t('common:loading')}</span>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {t('stampInventory.membersWithStamp.noMembers')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  {t('stampInventory.membersWithStamp.totalCount', { count: members.length })}
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

        {/* Footer */}
        <div className="flex justify-end p-6 border-t">
          <Button onClick={onClose} variant="outline">
            {t('common:close')}
          </Button>
        </div>
      </div>
    </div>
  );
};
