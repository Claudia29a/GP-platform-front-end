import { Component, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AccountApiService, accountErrorMessage } from '../../core/auth/account-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { GoogleIdentityService } from '../../core/auth/google-identity.service';
import { MAX_PASSWORD_LENGTH, PASSWORD_RULES, passwordRulesValidator } from '../../core/auth/password-rules';

type Mode = 'sign-in' | 'create';

/** The two password fields of the sign-up form must be the same. */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const { password, confirm } = group.value as { password: string; confirm: string };
  return confirm && password !== confirm ? { mismatch: true } : null;
}

/** Sign in with Google (ADR-006) or with email and password (ADR-010); both end in the same session. */
@Component({
  selector: 'app-sign-in',
  imports: [ReactiveFormsModule],
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.scss',
})
export class SignIn {
  private readonly auth = inject(AuthService);
  private readonly google = inject(GoogleIdentityService);
  private readonly accounts = inject(AccountApiService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  private readonly googleButton = viewChild.required<ElementRef<HTMLElement>>('googleButton');

  protected readonly sessionExpired = this.auth.sessionExpired;
  protected readonly mode = signal<Mode>('sign-in');
  protected readonly busy = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly rules = PASSWORD_RULES;
  protected readonly maxPasswordLength = MAX_PASSWORD_LENGTH;

  protected readonly signInForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly createForm = this.fb.group(
    {
      name: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, passwordRulesValidator]],
      confirm: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  /** The new password as the user types it, so the rules list can tick off what is met. */
  protected readonly newPassword = toSignal(this.createForm.controls.password.valueChanges, { initialValue: '' });

  constructor() {
    afterNextRender(() => {
      this.google
        .renderButton(this.googleButton().nativeElement, (token) => void this.complete(Promise.resolve(token)))
        .catch(() => this.errorMessage.set('Google sign-in could not be loaded. Please check your connection and try again.'));
    });
  }

  protected switchTo(mode: Mode): void {
    this.mode.set(mode);
    this.errorMessage.set(null);
  }

  protected signInWithEmail(): void {
    if (this.signInForm.invalid) {
      this.signInForm.markAllAsTouched();
      return;
    }
    const { email, password } = this.signInForm.getRawValue();
    void this.complete(this.loginToken(email, password));
  }

  protected createAccount(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const { name, email, password } = this.createForm.getRawValue();
    // A new account is signed in straight away.
    void this.complete(firstValueFrom(this.accounts.register(name.trim(), email.trim(), password)).then(() =>
      this.loginToken(email.trim(), password),
    ));
  }

  protected showError(control: AbstractControl): boolean {
    return control.invalid && control.touched;
  }

  private async loginToken(email: string, password: string): Promise<string> {
    return (await firstValueFrom(this.accounts.login(email.trim(), password))).token;
  }

  /** Every way of signing in ends here: the token becomes the session, then the start page for the role. */
  private async complete(token: Promise<string>): Promise<void> {
    this.busy.set(true);
    this.errorMessage.set(null);
    try {
      await this.auth.signIn(await token);
      await this.router.navigate(['/']);
    } catch (error) {
      this.errorMessage.set(accountErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
