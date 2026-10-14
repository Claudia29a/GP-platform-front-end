export type Role = 'PATIENT' | 'GP_ASSISTANT' | 'GP';

/** The signed-in user as returned by GET /me. */
export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export const ROLE_LABELS: Record<Role, string> = {
  PATIENT: 'Patient',
  GP_ASSISTANT: 'GP assistant',
  GP: 'GP',
};

export function isStaff(user: CurrentUser | null): boolean {
  return user?.role === 'GP_ASSISTANT' || user?.role === 'GP';
}
