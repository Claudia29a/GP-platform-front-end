import { Intake } from './intake.model';
import { Role } from './user.model';

/** One time a staff member opened a question. */
export interface AccessLogEntry {
  staffName: string;
  role: Role;
  viewedAt: string;
}

/** What the Account Service stores; null for someone who signs in with Google. */
export interface AccountData {
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
}

/** Everything CareBridge stores about a patient (GDPR Art. 15, 20). */
export interface MyData {
  user: { id: string; name: string; email: string };
  account: AccountData | null;
  privacyConsent: { version: string; acceptedAt: string } | null;
  questions: { question: Intake; openedBy: AccessLogEntry[] }[];
}
