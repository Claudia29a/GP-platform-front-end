export type Role = 'PATIENT' | 'GP_ASSISTANT' | 'GP';

/** The signed-in user as returned by GET /me. */
export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** False for a password account until the emailed code was typed in; Google always verifies. */
  emailVerified: boolean;
  /** True until a patient has allowed the use of their data. */
  privacyConsentNeeded: boolean;
}

export const ROLE_LABELS: Record<Role, string> = {
  PATIENT: 'Patient',
  GP_ASSISTANT: 'GP assistant',
  GP: 'GP',
};

export function isStaff(user: CurrentUser | null): boolean {
  return user?.role === 'GP_ASSISTANT' || user?.role === 'GP';
}
