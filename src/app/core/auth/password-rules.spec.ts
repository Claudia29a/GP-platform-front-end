import { FormControl } from '@angular/forms';

import { PASSWORD_RULES, passwordRulesValidator } from './password-rules';

describe('password rules', () => {
  const failed = (password: string) => passwordRulesValidator(new FormControl(password))?.['password'] ?? [];

  it('accepts a password that meets every rule', () => {
    expect(passwordRulesValidator(new FormControl('Secret12'))).toBeNull();
    expect(passwordRulesValidator(new FormControl('Ärzte 2026'))).toBeNull();
  });

  it('names each rule that is not met', () => {
    expect(failed('')).toEqual(['length', 'capital', 'number']);
    expect(failed('Secret1')).toEqual(['length']);
    expect(failed('secret12')).toEqual(['capital']);
    expect(failed('SecretPass')).toEqual(['number']);
  });

  it('allows at most 64 characters', () => {
    expect(failed('A1' + 'x'.repeat(62))).toEqual([]);
    expect(failed('A1' + 'x'.repeat(63))).toEqual(['length']);
  });

  it('describes the rules in plain words for the sign-up form', () => {
    expect(PASSWORD_RULES.map((rule) => rule.label)).toEqual([
      'At least 8 characters',
      'At least one capital letter',
      'At least one number',
    ]);
  });
});
