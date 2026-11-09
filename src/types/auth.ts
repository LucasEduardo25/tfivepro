export type UserRole = 'OWNER' | 'TRAINER' | 'STUDENT';

export type UserAccountStatus = 'active' | 'disabled' | 'pending';

export type StudentAccessStatus = 'NOT_ENABLED' | 'INVITED' | 'ACTIVE' | 'DISABLED';

export interface AppUser {
  id: string;
  authUid: string;
  role: UserRole;
  organizationId: string;
  studentId?: string; // Obrigatório quando role === 'STUDENT'
  status: UserAccountStatus;
  email?: string;
  displayName?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentAccessPermissions {
  schedule: boolean;
  currentWorkout: boolean;
  workoutHistory: boolean;
  currentCycle: boolean;
  evolution: boolean;
  assessments: boolean;
  reports: boolean;
  detailedLoads: boolean;
}

export interface StudentAccess {
  id: string;
  studentId: string;
  organizationId: string;
  enabled: boolean;
  status: StudentAccessStatus;
  permissions: StudentAccessPermissions;
  authUid?: string;
  invitedEmail?: string;
  inviteCode?: string;
  activatedAt?: string;
  lastAccessAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentInvite {
  id: string;
  studentId: string;
  organizationId: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  inviteCode: string;
  invitedEmail?: string;
  createdAt: string;
  expiresAt?: string;
}

export interface AuthContextState {
  user: AppUser | null;
  role: UserRole | null;
  organizationId: string;
  studentId?: string;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type NoteType = 'PRIVATE_TRAINER_NOTE' | 'STUDENT_VISIBLE_NOTE';

export interface ScopedNote {
  id: string;
  type: NoteType;
  content: string;
  createdAt: string;
  authorRole: UserRole;
}

/**
 * Padrão conservador de privacidade:
 * Não libera avaliações, fotos, relatórios ou cargas detalhadas automaticamente.
 * O Personal decide explicitamente o que disponibilizar.
 */
export const DEFAULT_STUDENT_PERMISSIONS: StudentAccessPermissions = {
  schedule: true,
  currentWorkout: true,
  workoutHistory: false,
  currentCycle: false,
  evolution: false,
  assessments: false,
  reports: false,
  detailedLoads: false
};

export class SecurityViolationError extends Error {
  public code: string;
  constructor(message: string, code: string = 'PERMISSION_DENIED') {
    super(message);
    this.name = 'SecurityViolationError';
    this.code = code;
  }
}
