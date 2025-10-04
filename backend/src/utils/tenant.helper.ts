/**
 * TENANT HELPER UTILITIES
 * 
 * Utility funkcije za rad s multi-tenant kontekstom
 * Koriste se u repository-jima i servisima za filtriranje podataka
 */

import { Request } from 'express';

/**
 * Dohvaća organization_id iz request konteksta
 * Baca grešku ako nije dostupan
 */
export function getOrganizationId(req: Request): number {
  if (!req.organizationId) {
    throw new Error('Organization ID nije dostupan u request kontekstu. Provjerite da je tenant middleware aktivan.');
  }
  return req.organizationId;
}

/**
 * Dohvaća organizaciju iz request konteksta
 */
export function getOrganization(req: Request) {
  if (!req.organization) {
    throw new Error('Organization nije dostupna u request kontekstu. Provjerite da je tenant middleware aktivan.');
  }
  return req.organization;
}

/**
 * Kreira Prisma where uvjet s organization_id filtrom
 * Koristi se u repository-jima za automatsko filtriranje
 */
export function createTenantWhere<T extends Record<string, unknown>>(
  organizationId: number,
  additionalWhere?: Record<string, unknown>
): Record<string, unknown> & { organization_id: number } {
  return {
    organization_id: organizationId,
    ...additionalWhere
  } as T & { organization_id: number };
}
/**
 * Kreira Prisma data objekt s organization_id
 * Koristi se pri kreiranju novih zapisa
 */
export function createTenantData<T extends Record<string, unknown>>(
  organizationId: number,
  data: T
): T & { organization_id: number } {
  return {
    organization_id: organizationId,
    ...data
  } as T & { organization_id: number };
}

/**
 * Middleware wrapper koji automatski dodaje tenant context u Prisma upite
 * NAPOMENA: Ovo je eksperimentalna funkcija - možda neće biti potrebna
 */
export function withTenant<T extends (...args: unknown[]) => unknown>(
  fn: T,
  req: Request
): T {
  const _organizationId = getOrganizationId(req);
  
  return ((...args: Parameters<T>) => {
    // Ovdje bismo mogli modificirati Prisma upite
    // Ali za sada jednostavno pozivamo originalnu funkciju
    return fn(...args);
  }) as T;
}

/**
 * Provjera da li zapis pripada trenutnoj organizaciji
 * Koristi se za sigurnosne provjere
 */
export function validateTenantAccess(
  record: { organization_id?: number | null },
  organizationId: number
): boolean {
  return record.organization_id === organizationId;
}

/**
 * Baca grešku ako zapis ne pripada trenutnoj organizaciji
 */
export function ensureTenantAccess(
  record: { organization_id?: number | null },
  organizationId: number,
  resourceName: string = 'Resource'
): void {
  if (!validateTenantAccess(record, organizationId)) {
    throw new Error(`${resourceName} ne pripada trenutnoj organizaciji`);
  }
}

/**
 * Filtrira niz zapisa tako da ostanu samo oni koji pripadaju organizaciji
 */
export function filterTenantRecords<T extends { organization_id?: number }>(
  records: T[],
  organizationId: number
): T[] {
  return records.filter(record => validateTenantAccess(record, organizationId));
}

/**
 * Tipovi za tenant-aware Prisma operacije
 */
export type TenantWhereInput<T> = T & { organization_id: number };
export type TenantCreateInput<T> = T & { organization_id: number };
export type TenantUpdateInput<T> = T; // Update ne treba organization_id jer se već filtrira u WHERE

/**
 * Helper za kreiranje tenant-aware Prisma select objekta
 * Automatski uključuje organization_id u select
 */
export function createTenantSelect<T extends Record<string, unknown>>(
  select?: T
): T & { organization_id: true } {
  return {
    organization_id: true,
    ...select
  } as T & { organization_id: true };
}
