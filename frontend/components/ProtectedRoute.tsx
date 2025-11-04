// frontend/components/ProtectedRoute.tsx
import React, { useCallback, useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../src/context/useAuth';
import { AuthTokenService } from '../src/utils/auth/AuthTokenService';
import { extractOrgSlugFromPath } from '../src/utils/tenantUtils';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Spremi trenutnu putanju kada korisnik pristupa zaštićenoj ruti
  useEffect(() => {
    if (user && location.pathname !== '/') {
      const orgSlug = extractOrgSlugFromPath();
      const loginPath = orgSlug ? `/${orgSlug}/login` : '/login';
      
      // Spremamo putanju samo ako nije login stranica i korisnik je prijavljen
      if (location.pathname !== loginPath) {
        sessionStorage.setItem('lastPath', location.pathname + location.search);
      }
    }
  }, [location.pathname, user]);
  
  // Periodička provjera valjanosti tokena
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Funkcija za provjeru valjanosti tokena
  const checkTokenValidity = useCallback(async () => {
    try {
      // Umjesto direktnog axios poziva koristimo centralizirani servis s single-flight zaštitom
      await AuthTokenService.refreshToken();
    } catch (error: unknown) {
      // Greška se logira unutar AuthTokenService, nema potrebe za dodatnim logiranjem
    }
  }, []);

  // Postavi periodičku provjeru tokena
  useEffect(() => {
    if (user && !isLoading) {
      // Provjeri odmah pri učitavanju
      void checkTokenValidity();
      
      // Postavi intervalnu provjeru svakih 5 minuta
      intervalRef.current = setInterval(() => {
        void checkTokenValidity();
      }, 5 * 60 * 1000); // 5 minuta
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, isLoading, checkTokenValidity]);

  // Ovaj effect rješava problem "No routes matched" warning-a
  // Kada se korisnik odjavi, odmah ga preusmjeravamo na login stranicu
  useEffect(() => {
    if (!isLoading && !user && location.pathname !== '/unauthorized') {
      const orgSlug = extractOrgSlugFromPath();
      const loginPath = orgSlug ? `/${orgSlug}/login` : '/login';
      
      // Provjeri da već nismo na login stranici
      if (location.pathname !== loginPath) {
        const redirectParam = encodeURIComponent(location.pathname + location.search);
        navigate(`${loginPath}?redirect=${redirectParam}`, { replace: true });
      }
    }
  }, [user, isLoading, location.pathname, navigate]);

  // Prikaži loader dok se provjerava autentifikacija
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="ml-2">Učitavanje...</p>
      </div>
    );
  }

  // Ako nema korisnika, prikazujemo loading dok se useEffect preusmjeravanje ne izvrši
  // Ovo sprječava React Router warning jer ne vraćamo Navigate komponentu
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="ml-2">Preusmjeravanje...</p>
      </div>
    );
  }

  // Dodajemo provjeru da li user.role postoji
  if (allowedRoles && user.role && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;