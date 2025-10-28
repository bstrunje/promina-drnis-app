/**
 * FOOTER KOMPONENTA
 * 
 * Prikazuje kontakt informacije organizacije i linkove na dokumente
 * Dinamički učitava podatke iz branding context-a
 */

import React from 'react';
import { useBranding } from '../hooks/useBranding';
import { Mail, Phone, Globe, MapPin } from 'lucide-react';

const Footer: React.FC = () => {
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
    <footer className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white mt-auto border-t border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 py-6">
        {/* Tenant-specific sadržaj */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-4 text-center sm:text-left">
          {/* Kontakt informacije */}
          <div>
            <h3 className="text-base font-bold mb-3" style={{ color: getPrimaryColor() }}>
              {getFullName()}
            </h3>
            <div className="space-y-2 text-sm">
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
            <h3 className="text-base font-bold mb-3">Dokumenti</h3>
            <div className="space-y-2 text-sm">
              {getEthicsCodeUrl() && (
                <div>
                  <a 
                    href={getEthicsCodeUrl() ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-gray-600 dark:text-gray-300"
                    style={{ color: getPrimaryColor() }}
                  >
                    Etički kodeks
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
                    Pravila privatnosti
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
                    Pravila članstva
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* O aplikaciji */}
          <div>
            <h3 className="text-base font-bold mb-3">O aplikaciji</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Sustav za upravljanje članstvom i aktivnostima.
            </p>
          </div>
        </div>

        {/* Hardkodirani copyright - developer */}
        <div className="border-t border-gray-300 dark:border-gray-700 pt-3 mt-2">
          <p className="text-xs text-gray-500 dark:text-gray-500 text-center leading-relaxed">
            © 2025 Božo Strunje. Sva prava pridržana.<br className="sm:hidden" />
            <span className="hidden sm:inline"> </span>Aplikacija dostupna besplatno za ograničenu upotrebu.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
