import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@components/ui/button';
import { Globe } from 'lucide-react';

interface LanguageToggleProps {
  onLanguageChange?: () => void;
}

const LanguageToggle: React.FC<LanguageToggleProps> = ({ onLanguageChange }) => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLanguage = i18n.language === 'hr' ? 'en' : 'hr';
    void i18n.changeLanguage(newLanguage); // namjerno ignoriramo Promise radi ESLint pravila
    if (onLanguageChange) onLanguageChange();
  };
  // Prikazujemo JEZIK NA KOJI ĆEMO PREBACITI (ciljni jezik)
  const targetLanguageLabel = i18n.language === 'hr' ? 'EN' : 'HR';

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center space-x-2 min-w-[70px]"
      title={`Switch to ${targetLanguageLabel}`}
    >
      <Globe className="h-4 w-4" />
      <span className="font-medium">{targetLanguageLabel}</span>
    </Button>
  );
};

export default LanguageToggle;