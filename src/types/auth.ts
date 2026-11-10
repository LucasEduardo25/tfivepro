export type UserRole = 'OWNER' | 'TRAINER';

export type UserAccountStatus = 'active' | 'disabled' | 'pending';

export interface AppUser {
  id: string;
  authUid: string;
  role: UserRole;
  organizationId: string;
  status: UserAccountStatus;
  email?: string;
  displayName?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthContextState {
  user: AppUser | null;
  role: UserRole | null;
  organizationId: string;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export class SecurityViolationError extends Error {
  public code: string;
  constructor(message: string, code: string = 'PERMISSION_DENIED') {
    super(message);
    this.name = 'SecurityViolationError';
    this.code = code;
  }
}
