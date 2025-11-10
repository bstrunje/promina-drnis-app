/**
 * FOOTER KOMPONENTA
 * 
 * Prikazuje kontakt informacije organizacije i linkove na dokumente
 * Dinamički učitava podatke iz branding context-a
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBranding } from '../hooks/useBranding';
import { Mail, Phone, Globe, MapPin, ChevronDown } from 'lucide-react';

const Footer: React.FC = () => {
  const { t } = useTranslation('common');
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);
  const {
    getFullName,
    getContactEmail,
    getContactPhone,
    getWebsiteUrl,
    getFullAddress,
    getEthicsCodeUrl,
    getPrivacyPolicyUrl,
    getMembershipRulesUrl,
    getPrimaryColor,
  } = useBranding();

  return (
    <footer className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white mt-auto border-t border-gray-200 dark:border-gray-700 w-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tenant-specific sadržaj */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-4 text-center sm:text-left">
          {/* Kontakt informacije */}
          <div>
            <button
              onClick={() => setIsContactOpen(!isContactOpen)}
              className="flex items-center justify-between w-full text-base font-bold mb-3 sm:cursor-default"
              style={{ color: getPrimaryColor() }}
            >
              <span>{getFullName()}</span>
              <ChevronDown 
                className={`sm:hidden transition-transform ${isContactOpen ? 'rotate-180' : ''}`} 
                size={20} 
              />
            </button>
            <div className={`space-y-2 text-sm ${isContactOpen ? 'block' : 'hidden'} sm:block`}>
              {getFullAddress() && (
                <div className="flex items-start gap-2 justify-center sm:justify-start">
                  <MapPin size={14} className="mt-1 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-300">{getFullAddress()}</span>
                </div>
              )}
              {getContactEmail() && (
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <Mail size={14} className="flex-shrink-0" />
                  <a 
                    href={`mailto:${getContactEmail()}`}
                    className="hover:underline text-gray-600 dark:text-gray-300"
                    style={{ color: getPrimaryColor() }}
                  >
                    {getContactEmail()}
                  </a>
                </div>
              )}
              {getContactPhone() && (
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <Phone size={14} className="flex-shrink-0" />
                  <a 
                    href={`tel:${getContactPhone()}`}
                    className="hover:underline text-gray-600 dark:text-gray-300"
                  >
                    {getContactPhone()}
                  </a>
                </div>
              )}
              {getWebsiteUrl() && (
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <Globe size={14} className="flex-shrink-0" />
                  <a 
                    href={getWebsiteUrl() ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-gray-600 dark:text-gray-300"
                    style={{ color: getPrimaryColor() }}
                  >
                    {(getWebsiteUrl() ?? '').replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Dokumenti */}
          <div>
            <button
              onClick={() => setIsDocumentsOpen(!isDocumentsOpen)}
              className="flex items-center justify-between w-full text-base font-bold mb-3 sm:cursor-default"
            >
              <span>{t('footer.documents')}</span>
              <ChevronDown 
                className={`sm:hidden transition-transform ${isDocumentsOpen ? 'rotate-180' : ''}`} 
                size={20} 
              />
            </button>
            <div className={`space-y-2 text-sm ${isDocumentsOpen ? 'block' : 'hidden'} sm:block`}>
              {getEthicsCodeUrl() && (
                <div>
                  <a 
                    href={getEthicsCodeUrl() ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-gray-600 dark:text-gray-300"
                    style={{ color: getPrimaryColor() }}
                  >
                    {t('footer.ethicsCode')}
                  </a>
                </div>
              )}
              {getPrivacyPolicyUrl() && (
                <div>
                  <a 
                    href={getPrivacyPolicyUrl() ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-gray-600 dark:text-gray-300"
                    style={{ color: getPrimaryColor() }}
                  >
                    {t('footer.privacyPolicy')}
                  </a>
                </div>
              )}
              {getMembershipRulesUrl() && (
                <div>
                  <a 
                    href={getMembershipRulesUrl() ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-gray-600 dark:text-gray-300"
                    style={{ color: getPrimaryColor() }}
                  >
                    {t('footer.membershipRules')}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* O aplikaciji */}
          <div>
            <h3 className="text-base font-bold mb-3">{t('footer.aboutApp')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t('footer.appDescription')}
            </p>
          </div>
        </div>

        {/* Hardkodirani copyright - developer */}
        <div className="border-t border-gray-300 dark:border-gray-700 pt-3 mt-2">
          <p className="text-xs text-gray-500 dark:text-gray-500 text-center leading-relaxed">
            {t('footer.copyright', { year: new Date().getFullYear() })}<br className="sm:hidden" />
            <span className="hidden sm:inline"> </span>{t('footer.freeUsage')}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
