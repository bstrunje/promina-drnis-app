import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@components/ui/button';
import { Alert, AlertDescription } from '@components/ui/alert';
import { useToast } from '@components/ui/use-toast';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../utils/api/apiConfig';

interface PinSetupProps {
  memberId: number;
}

interface PinStatus {
  hasPin: boolean;
  pinSetAt: string | null;
  isLocked: boolean;
  lockedUntil: string | null;
}

const PinSetup: React.FC<PinSetupProps> = ({ memberId }) => {
  const { t } = useTranslation('profile');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pinStatus, setPinStatus] = useState<PinStatus | null>(null);
  const [isChanging, setIsChanging] = useState(false);
  const { toast } = useToast();

  const fetchPinStatus = useCallback(async () => {
    try {
      const response = await api.get(`/members/${memberId}/pin-status`);
      setPinStatus(response.data as PinStatus);
    } catch (error) {
      console.error('Greška pri dohvaćanju PIN statusa:', error);
    }
  }, [memberId]);

  // Dohvati PIN status pri učitavanju
  useEffect(() => {
    void fetchPinStatus();
  }, [fetchPinStatus]);

  const validatePin = (pinValue: string): string | null => {
    if (!pinValue) return t('pinSetup.validation.required');
    if (pinValue.length < 4) return t('pinSetup.validation.tooShort');
    if (pinValue.length > 6) return t('pinSetup.validation.tooLong');
    if (!/^\d+$/.test(pinValue)) return t('pinSetup.validation.numbersOnly');
    if (/^(\d)\1+$/.test(pinValue)) return t('pinSetup.validation.noRepeating');
    
    // Provjeri jednostavne sekvence
    const sequences = ['0123', '1234', '2345', '3456', '4567', '5678', '6789'];
    const reverseSequences = sequences.map(seq => seq.split('').reverse().join(''));
    if (sequences.includes(pinValue) || reverseSequences.includes(pinValue)) {
      return t('pinSetup.validation.noSequence');
    }
    
    return null;
  };

  const handleSetPin = async () => {
    const pinError = validatePin(pin);
    if (pinError) {
      toast({
        title: t('updateErrorTitle'),
        description: pinError,
        variant: 'destructive',
      });
      return;
    }

    if (pin !== confirmPin) {
      toast({
        title: t('updateErrorTitle'),
        description: t('pinSetup.validation.mismatch'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const payload = pinStatus?.hasPin 
        ? { newPin: pin, currentPin }
        : { newPin: pin };

      await api.post(`/members/${memberId}/set-pin`, payload);
      
      toast({
        title: t('updateSuccessTitle'),
        description: pinStatus?.hasPin ? t('pinSetup.messages.changeSuccess') : t('pinSetup.messages.setSuccess'),
      });

      // Reset form
      setPin('');
      setConfirmPin('');
      setCurrentPin('');
      setIsChanging(false);
      
      // Refresh status
      await fetchPinStatus();
    } catch (error: unknown) {
      const message = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message ?? t('pinSetup.messages.setError')
        : t('pinSetup.messages.setError');
      toast({
        title: t('updateErrorTitle'),
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePin = async () => {
    if (!currentPin) {
      toast({
        title: t('updateErrorTitle'),
        description: t('pinSetup.validation.currentRequired'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await api.delete(`/members/${memberId}/remove-pin`, {
        data: { currentPin }
      });
      
      toast({
        title: t('updateSuccessTitle'),
        description: t('pinSetup.messages.removeSuccess'),
      });

      setCurrentPin('');
      setIsChanging(false);
      await fetchPinStatus();
    } catch (error: unknown) {
      const message = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message ?? t('pinSetup.messages.removeError')
        : t('pinSetup.messages.removeError');
      toast({
        title: t('updateErrorTitle'),
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!pinStatus) {
    return <div className="p-4">{t('pinSetup.loading')}</div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">{t('pinSetup.title')}</h3>
      </div>

      {pinStatus.isLocked && (
        <Alert className="mb-4">
          <AlertDescription>
            {t('pinSetup.status.locked')}
            {pinStatus.lockedUntil && (
              <> {t('pinSetup.status.lockedUntil', { date: new Date(pinStatus.lockedUntil).toLocaleString() })}</>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {pinStatus.hasPin ? (
          <div className="bg-green-50 p-3 rounded border border-green-200">
            <p className="text-sm text-green-800">
              ✅ {t('pinSetup.status.hasPin')} {pinStatus.pinSetAt && !isNaN(new Date(pinStatus.pinSetAt).getTime()) && `(${new Date(pinStatus.pinSetAt).toLocaleDateString()})`}
            </p>
          </div>
        ) : (
          <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
            <p className="text-sm text-yellow-800">
              ⚠️ {t('pinSetup.status.noPinWarning')}
            </p>
          </div>
        )}

        {!isChanging ? (
          <div className="flex gap-2">
            <Button
              onClick={() => setIsChanging(true)}
              variant="outline"
            >
              {pinStatus.hasPin ? t('pinSetup.buttons.changePin') : t('pinSetup.buttons.setPin')}
            </Button>
            {pinStatus.hasPin && (
              <Button
                onClick={() => setIsChanging(true)}
                variant="outline"
                className="text-red-600 hover:text-red-700"
              >
                {t('pinSetup.buttons.removePin')}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {pinStatus.hasPin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pinSetup.form.currentPinLabel')}
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value)}
                    placeholder={t('pinSetup.form.currentPinPlaceholder')}
                    maxLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
                  >
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {pinStatus.hasPin ? t('pinSetup.form.newPinLabel') : t('pinSetup.form.pinLabel')} {t('pinSetup.form.pinLengthHint')}
              </label>
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={t('pinSetup.form.pinPlaceholder')}
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('pinSetup.form.confirmPinLabel')}
              </label>
              <input
                type={showPin ? 'text' : 'password'}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder={t('pinSetup.form.confirmPinPlaceholder')}
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>{t('pinSetup.security.title')}</strong>
              </p>
              <ul className="text-xs text-blue-700 mt-1 space-y-1">
                <li>• {t('pinSetup.security.noBirthDate')}</li>
                <li>• {t('pinSetup.security.noSequence')}</li>
                <li>• {t('pinSetup.security.loginRequired')}</li>
                <li>• {t('pinSetup.security.rememberDevice')}</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => { void handleSetPin(); }}
                disabled={isLoading || !pin || !confirmPin || (pinStatus.hasPin && !currentPin)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? t('pinSetup.buttons.saving') : (pinStatus.hasPin ? t('pinSetup.buttons.changePin') : t('pinSetup.buttons.setPin'))}
              </Button>
              
              {pinStatus.hasPin && (
                <Button
                  onClick={() => { void handleRemovePin(); }}
                  disabled={isLoading || !currentPin}
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                >
                  {isLoading ? t('pinSetup.buttons.removing') : t('pinSetup.buttons.removePin')}
                </Button>
              )}
              
              <Button
                onClick={() => {
                  setIsChanging(false);
                  setPin('');
                  setConfirmPin('');
                  setCurrentPin('');
                }}
                variant="outline"
              >
                {t('pinSetup.buttons.cancel')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PinSetup;