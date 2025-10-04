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

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-800 text-white mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Kontakt informacije */}
          <div>
            <h3 className="text-lg font-bold mb-4" style={{ color: getPrimaryColor() }}>
              {getFullName()}
            </h3>
            <div className="space-y-2 text-sm">
              {getFullAddress() && (
                <div className="flex items-start gap-2">
                  <MapPin size={16} className="mt-1 flex-shrink-0" />
                  <span>{getFullAddress()}</span>
                </div>
              )}
              {getContactEmail() && (
                <div className="flex items-center gap-2">
                  <Mail size={16} className="flex-shrink-0" />
                  <a 
                    href={`mailto:${getContactEmail()}`}
                    className="hover:underline"
                    style={{ color: getPrimaryColor() }}
                  >
                    {getContactEmail()}
                  </a>
                </div>
              )}
              {getContactPhone() && (
                <div className="flex items-center gap-2">
                  <Phone size={16} className="flex-shrink-0" />
                  <a 
                    href={`tel:${getContactPhone()}`}
                    className="hover:underline"
                  >
                    {getContactPhone()}
                  </a>
                </div>
              )}
              {getWebsiteUrl() && (
                <div className="flex items-center gap-2">
                  <Globe size={16} className="flex-shrink-0" />
                  <a 
                    href={getWebsiteUrl() ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
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
            <h3 className="text-lg font-bold mb-4">Dokumenti</h3>
            <div className="space-y-2 text-sm">
              {getEthicsCodeUrl() && (
                <div>
                  <a 
                    href={getEthicsCodeUrl() ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
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
                    className="hover:underline"
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
                    className="hover:underline"
                    style={{ color: getPrimaryColor() }}
                  >
                    Pravila članstva
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Copyright */}
          <div>
            <h3 className="text-lg font-bold mb-4">O aplikaciji</h3>
            <p className="text-sm text-gray-400">
              Sustav za upravljanje članstvom i aktivnostima planinarskih društava.
            </p>
            <p className="text-sm text-gray-400 mt-4">
              © {currentYear} {getFullName()}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
