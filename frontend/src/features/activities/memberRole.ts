// Pomoćne tipove i konstante izdvojene iz MemberRoleSelect.tsx
// Ovo omogućuje da TSX datoteka izvozi samo React komponente (react-refresh rule)

import { ParticipantRole } from '@shared/activity.types';
export { ParticipantRole };

export const rolesToRecognitionPercentage: Record<ParticipantRole, number> = {
  [ParticipantRole.GUIDE]: 100,
  [ParticipantRole.ASSISTANT_GUIDE]: 50,
  [ParticipantRole.DRIVER]: 100,
  [ParticipantRole.REGULAR]: 10,
};

export interface MemberWithRole {
  memberId: string;
  role: ParticipantRole;
  manualRecognition?: number | null;
}

// Uloge koje se međusobno isključuju (samo jedna po aktivnosti)
export const exclusiveRoles: ParticipantRole[] = [
  ParticipantRole.GUIDE
  // DRIVER je uklonjen - može biti više vozača
];

// Provjera da li je uloga ekskluzivna (može je imati samo jedan član)
export const isExclusiveRole = (role: ParticipantRole): boolean => {
  return exclusiveRoles.includes(role);
};

// Izračunava postotak priznavanja za vozače na temelju broja vozača
export const calculateDriverRecognitionPercentage = (numberOfDrivers: number): number => {
  if (numberOfDrivers <= 1) return 100;
  if (numberOfDrivers === 2) return 50;
  if (numberOfDrivers === 3) return 33;
  if (numberOfDrivers >= 4) return 25;
  return 100; // fallback
};

// Ažurirana funkcija za izračun postotka priznavanja s dinamičkim vozačima
export const calculateRecognitionPercentage = (role: ParticipantRole, selectedMembers: { role: ParticipantRole }[]): number => {
  if (role === ParticipantRole.DRIVER) {
    const numberOfDrivers = selectedMembers.filter(m => m.role === ParticipantRole.DRIVER).length;
    return calculateDriverRecognitionPercentage(numberOfDrivers);
  }
  
  // Za ostale uloge koristi standardni postotak
  return rolesToRecognitionPercentage[role];
};
