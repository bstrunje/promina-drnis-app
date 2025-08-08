// frontend/components/ProtectedRoute.tsx
import React, { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../src/context/useAuth';
import { API_BASE_URL } from '../src/utils/config';
import axios from 'axios';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Spremi trenutnu putanju kada korisnik pristupa zaštićenoj ruti
  useEffect(() => {
    if (user && location.pathname !== '/' && location.pathname !== '/login') {
      // Spremamo putanju samo ako je korisnik prijavljen
      sessionStorage.setItem('lastPath', location.pathname);
    }
  }, [location.pathname, user]);
  
  // Periodička provjera valjanosti tokena
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Funkcija za provjeru valjanosti tokena
  const checkTokenValidity = async () => {
    try {
      // Pozivamo refresh endpoint umjesto health checka - koristimo centraliziranu konfiguraciju
      await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
        withCredentials: true
      });
    } catch (error: any) {
      // Ako token nije valjan, automatski odjavi korisnika
      if (error.response?.status === 401) {
        console.log('Token nije valjan, odjavljujem korisnika...');
        await logout();
      }
    }
  };

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
  }, [user, isLoading, logout]);

  // Ovaj effect rješava problem "No routes matched" warning-a
  // Kada se korisnik odjavi, odmah ga preusmjeravamo na login stranicu
  useEffect(() => {
    if (!isLoading && !user && location.pathname !== '/login' && location.pathname !== '/unauthorized') {
      const redirectParam = location.pathname ? encodeURIComponent(location.pathname) : '';
      navigate(`/login?redirect=${redirectParam}`, { replace: true });
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