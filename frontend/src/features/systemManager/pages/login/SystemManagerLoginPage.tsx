// features/systemManager/pages/login/SystemManagerLoginPage.tsx
import React, { useState } from 'react';
import { Eye, EyeOff, LogIn, Shield } from 'lucide-react';
import { useSystemManager } from '../../../../context/SystemManagerContext';
import logoImage from '../../../../assets/images/grbPD_bez_natpisa_pozadina.png';

const SystemManagerLoginPage: React.FC = () => {
  const { login } = useSystemManager(); // 'loading' nije korišten
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('Molimo unesite korisničko ime i lozinku');
      return;
    }
    
    setError('');
    setIsLoggingIn(true);
    
    try {
      await login({ username, password });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Greška prilikom prijave. Provjerite korisničko ime i lozinku.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 mb-4 flex items-center justify-center">
            <img src={logoImage} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 text-center">
            System Manager Pristup
          </h1>
          <div className="flex items-center mt-2">
            <Shield className="w-5 h-5 text-blue-600 mr-1" />
            <p className="text-sm text-gray-600">Ograničeni pristup - samo za managere sustava</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={e => { void handleSubmit(e); }}>

          <div className="mb-4">
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Korisničko ime
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Unesite korisničko ime"
              disabled={isLoggingIn}
              autoComplete="username"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Lozinka
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                placeholder="Unesite lozinku"
                disabled={isLoggingIn}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`w-full flex items-center justify-center py-2 px-4 rounded-md text-white font-medium 
              ${isLoggingIn ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <>
                <span className="spinner mr-2"></span>
                Prijava u tijeku...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                Prijavi se
              </>
            )}
          </button>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Ova stranica služi samo za prijavu managera sustava.
              <br />Za člansku prijavu, molimo posjetite{' '}
              <a href="/login" className="text-blue-600 hover:underline">standardnu prijavu</a>.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SystemManagerLoginPage;
