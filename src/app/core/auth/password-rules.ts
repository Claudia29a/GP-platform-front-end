import { AbstractControl, ValidationErrors } from '@angular/forms';

export interface PasswordRule {
  id: 'length' | 'capital' | 'number';
  label: string;
  test: (password: string) => boolean;
}

/** At most 64 characters, because the server's password hashing (BCrypt) only uses the first 72 bytes. */
export const MAX_PASSWORD_LENGTH = 64;

/** The rules a new password must meet; the Account Service checks exactly the same ones (ADR-010). */
export const PASSWORD_RULES: readonly PasswordRule[] = [
  { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 && p.length <= MAX_PASSWORD_LENGTH },
  { id: 'capital', label: 'At least one capital letter', test: (p) => /\p{Lu}/u.test(p) },
  { id: 'number', label: 'At least one number', test: (p) => /\d/.test(p) },
];

/** Form validator: `{ password: ['capital', …] }` lists the rules that are not met yet. */
export function passwordRulesValidator(control: AbstractControl<string | null>): ValidationErrors | null {
  const failed = PASSWORD_RULES.filter((rule) => !rule.test(control.value ?? '')).map((rule) => rule.id);
  return failed.length ? { password: failed } : null;
}
