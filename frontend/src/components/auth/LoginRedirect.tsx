import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

/**
 * Komponenta koja upravlja preusmjeravanjem nakon uspješne prijave
 */
const LoginRedirect: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  
  useEffect(() => {
    if (isAuthenticated && user) {
      // Dobavi putanju iz URL-a ili session storage-a
      const redirectPath = searchParams.get('redirect') ?? sessionStorage.getItem('lastPath');
      
      // Očisti spremljenu putanju
      sessionStorage.removeItem('lastPath');
      
      if (redirectPath && redirectPath !== '/' && redirectPath !== '/login') {
        navigate(redirectPath);
      } else {
        // Preusmjeri korisnika na odgovarajući dashboard prema ulozi (role)
        switch(user.role) {
          case 'member_administrator':
            navigate("/admin/dashboard");
            break;
          case 'member_superuser':
            navigate("/superuser/dashboard");
            break;
          case 'member':
            navigate("/member/dashboard");
            break;
          default:
            navigate("/profile");
        }
      }
    }
  }, [isAuthenticated, navigate, searchParams, user]);
  
  return null; // Ova komponenta ne renderira ništa
};

export default LoginRedirect;
