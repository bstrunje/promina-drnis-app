import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Tenant Selector - Stranica za odabir organizacije
 * Prikazuje se na root "/" path-u kada korisnik nema odabranu organizaciju
 * 
 * PWA KOMPATIBILNOST:
 * - Provjerava localStorage za cached tenant (od prethodnog PWA sessiona)
 * - Ako postoji cached tenant → automatski redirect
 */
export default function TenantSelector() {
  const navigate = useNavigate();
  const [orgSlug, setOrgSlug] = useState('');
  const [error, setError] = useState('');

  // PWA auto-redirect: Ako postoji cached tenant, automatski preusmjeri
  useEffect(() => {
    const cachedTenant = localStorage.getItem('current_tenant');
    if (cachedTenant) {
      console.log('[TENANT-SELECTOR] Found cached tenant, redirecting to:', cachedTenant);
      navigate(`/${cachedTenant}/login`, { replace: true });
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validacija - samo slova, brojevi i crtice
    const validSlugRegex = /^[a-z0-9-]+$/;
    if (!orgSlug || !validSlugRegex.test(orgSlug)) {
      setError('Unesite valjan naziv organizacije (samo mala slova, brojevi i crtice)');
      return;
    }
    
    // Redirect na login te organizacije
    navigate(`/${orgSlug}/login`);
  };

  // Poznate organizacije - SAMO one koje su javno dostupne
  // SIGURNOST: NE prikazivati sve organizacije (sprječava enumeration attack)
  // Ovdje trebaju biti SAMO organizacije koje žele biti javno dostupne
  const knownOrgs = [
    { slug: 'promina', name: 'Planinarsko društvo Promina' },
    // Dodaj SAMO organizacije koje žele biti javno vidljive
    // Ostale organizacije mogu pristupiti direktnim URL-om ako znaju naziv
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="text-gray-400 text-6xl mb-4">🏔️</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Dobrodošli</h1>
          <p className="text-gray-600">
            Odaberite ili unesite naziv vaše organizacije
          </p>
        </div>

        {/* Poznate organizacije - quick access */}
        {knownOrgs.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Brzi pristup:</h2>
            <div className="space-y-2">
              {knownOrgs.map((org) => (
                <button
                  key={org.slug}
                  onClick={() => navigate(`/${org.slug}/login`)}
                  className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                >
                  <div className="font-semibold text-blue-900">{org.name}</div>
                  <div className="text-sm text-blue-600">/{org.slug}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ili unesi ručno */}
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">ili unesite ručno</span>
          </div>
        </div>

        {/* Manual input form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="orgSlug" className="block text-sm font-medium text-gray-700 mb-1">
              Naziv organizacije
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">/</span>
              <input
                type="text"
                id="orgSlug"
                value={orgSlug}
                onChange={(e) => {
                  setOrgSlug(e.target.value.toLowerCase());
                  setError('');
                }}
                placeholder="npr. promina"
                className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {error && (
              <p className="mt-1 text-sm text-red-600">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Nastavi
          </button>
        </form>

        {/* Pomoć */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Naziv organizacije možete pronaći u URL-u vaše organizacije
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Primjer: app.com<strong>/promina</strong>/login
          </p>
        </div>
      </div>
    </div>
  );
}
