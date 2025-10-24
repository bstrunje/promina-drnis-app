import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { extractOrgSlugFromPath } from '../../utils/tenantUtils';

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
        // Dohvati org slug iz trenutnog URL-a
        const orgSlug = extractOrgSlugFromPath();
        const orgPrefix = orgSlug ? `/${orgSlug}` : '';
        
        // Preusmjeri korisnika na odgovarajući dashboard prema ulozi (role)
        switch(user.role) {
          case 'member_administrator':
            navigate(`${orgPrefix}/admin/dashboard`);
            break;
          case 'member_superuser':
            navigate(`${orgPrefix}/superuser/dashboard`);
            break;
          case 'member':
            navigate(`${orgPrefix}/member/dashboard`);
            break;
          default:
            navigate(`${orgPrefix}/profile`);
        }
      }
    }
  }, [isAuthenticated, navigate, searchParams, user]);
  
  return null; // Ova komponenta ne renderira ništa
};

export default LoginRedirect;
