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

  const currentLanguage = i18n.language === 'hr' ? 'HR' : 'EN';

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center space-x-2 min-w-[70px]"
      title={`Switch to ${currentLanguage === 'HR' ? 'EN' : 'HR'}`}
    >
      <Globe className="h-4 w-4" />
      <span className="font-medium">{currentLanguage}</span>
    </Button>
  );
};

export default LanguageToggle;