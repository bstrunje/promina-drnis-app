// /backend/src/global.d.ts

// Proširenje Express Request tipa na jednom mjestu (uklanja potrebu za namespace u ostalim datotekama)
declare global {
  namespace Express {
    interface Request {
      // Minimalni shape kako bismo izbjegli cikličke ovisnosti o tipovima
      user?: {
        id: number;
        role: string;
        role_name: string;
        member_id?: number;
        is_SystemManager?: boolean;
        user_type: 'member' | 'SystemManager';
        performer_type: import('@prisma/client').PerformerType;
        organization_id?: number;
      };
      isTestMode?: boolean;
    }
  }
}

export {};