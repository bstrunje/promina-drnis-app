// Pomoćne tipove i konstante izdvojene iz MemberRoleSelect.tsx
// Ovo omogućuje da TSX datoteka izvozi samo React komponente (react-refresh rule)

export enum ParticipantRole {
  GUIDE = 'GUIDE',
  ASSISTANT_GUIDE = 'ASSISTANT_GUIDE',
  DRIVER = 'DRIVER',
  REGULAR = 'REGULAR'
}

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
