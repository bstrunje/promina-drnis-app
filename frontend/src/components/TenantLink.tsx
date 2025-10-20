import React from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { extractOrgSlugFromPath } from '../utils/tenantUtils';

/**
 * Link komponenta koja automatski dodaje org prefix ako postoji
 * Koristi se umjesto standardne React Router Link komponente
 */
export const TenantLink: React.FC<LinkProps> = ({ to, children, ...props }) => {
  // Dohvati org slug iz trenutnog URL-a
  const orgSlug = extractOrgSlugFromPath();
  
  // Konvertiraj 'to' u string
  const toPath = typeof to === 'string' ? to : to.pathname ?? '';
  
  // Ako nema org slug-a ili path već ima org prefix, vrati standardan Link
  if (!orgSlug || toPath.startsWith(`/${orgSlug}/`)) {
    return <Link to={to} {...props}>{children}</Link>;
  }
  
  // Dodaj org prefix
  const prefixedPath = typeof to === 'string' 
    ? `/${orgSlug}${to}`
    : { ...to, pathname: `/${orgSlug}${to.pathname ?? ''}` };
  
  return <Link to={prefixedPath} {...props}>{children}</Link>;
};
