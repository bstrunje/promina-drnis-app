/**
 * LEGACY PRISMA HELPER
 * 
 * Backward compatibility funkcije za postojeće Prisma upite
 * koji nisu još ažurirani za multi-tenant arhitekturu
 */

import { Request } from 'express';
import { getOrganizationId } from './tenant.helper.js';

/**
 * Kreira compound unique constraint za Skill model
 */
export function createSkillWhere(organizationId: number, key: string) {
  return {
    organization_id_key: {
      organization_id: organizationId,
      key: key
    }
  };
}

/**
 * Kreira compound unique constraint za ActivityType model
 */
export function createActivityTypeWhere(organizationId: number, key: string) {
  return {
    organization_id_key: {
      organization_id: organizationId,
      key: key
    }
  };
}

/**
 * Kreira compound unique constraint za CardNumber model
 */
export function createCardNumberWhere(organizationId: number, cardNumber: string) {
  return {
    organization_id_card_number: {
      organization_id: organizationId,
      card_number: cardNumber
    }
  };
}

/**
 * SystemSettings where - sada je unique po organizaciji
 */
export function createSystemSettingsWhere(organizationId: number) {
  return {
    organization_id: organizationId
  };
}

/**
 * Helper funkcije s Request kontekstom
 */
export function createSkillWhereFromReq(req: Request, key: string) {
  const organizationId = getOrganizationId(req);
  return createSkillWhere(organizationId, key);
}

export function createActivityTypeWhereFromReq(req: Request, key: string) {
  const organizationId = getOrganizationId(req);
  return createActivityTypeWhere(organizationId, key);
}

export function createCardNumberWhereFromReq(req: Request, cardNumber: string) {
  const organizationId = getOrganizationId(req);
  return createCardNumberWhere(organizationId, cardNumber);
}

export function createSystemSettingsWhereFromReq(req: Request) {
  const organizationId = getOrganizationId(req);
  return createSystemSettingsWhere(organizationId);
}

/**
 * Legacy compatibility - za kod koji još nije ažuriran
 * NAPOMENA: Ove funkcije koriste organizationId = 1 (PD Promina) kao fallback
 */
export function legacySkillWhere(key: string) {
  return createSkillWhere(1, key);
}

export function legacyActivityTypeWhere(key: string) {
  return createActivityTypeWhere(1, key);
}

export function legacyCardNumberWhere(cardNumber: string) {
  return createCardNumberWhere(1, cardNumber);
}

export function legacySystemSettingsWhere() {
  return createSystemSettingsWhere(1);
}
