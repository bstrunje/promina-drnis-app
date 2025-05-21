// prisma-extensions.ts
import { Prisma } from '@prisma/client';

/**
 * Proširenje Prisma tipa za update operacije na Member modelu
 * Dodaje polja za praćenje neuspjelih prijava koja možda nisu dostupna u generiranim tipovima
 */
export interface MemberUpdateExtension {
  failed_login_attempts?: number;
  locked_until?: Date | null;
  last_failed_login?: Date | null;
}

/**
 * Tip koji kombinira standardni Prisma tip s našim proširenjem
 */
export type MemberUpdateData = Prisma.MemberUpdateInput & MemberUpdateExtension;
