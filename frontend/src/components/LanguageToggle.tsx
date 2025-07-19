import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@components/ui/button';
import { Globe } from 'lucide-react';

const LanguageToggle: React.FC = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLanguage = i18n.language === 'hr' ? 'en' : 'hr';
    i18n.changeLanguage(newLanguage);
  };

  const currentLanguage = i18n.language === 'hr' ? 'HR' : 'EN';
  const nextLanguage = i18n.language === 'hr' ? 'EN' : 'HR';

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center space-x-2 min-w-[70px]"
      title={`Switch to ${nextLanguage}`}
    >
      <Globe className="h-4 w-4" />
      <span className="font-medium">{currentLanguage}</span>
    </Button>
  );
};

export default LanguageToggle;
