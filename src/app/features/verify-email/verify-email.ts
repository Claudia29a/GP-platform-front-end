import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AccountApiService, accountErrorMessage } from '../../core/auth/account-api.service';
import { AuthService } from '../../core/auth/auth.service';

/** After creating an account: the user types the 6-digit code from the email to prove the address is theirs. */
@Component({
  selector: 'app-verify-email',
  imports: [ReactiveFormsModule],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.scss',
})
export class VerifyEmail {
  private readonly auth = inject(AuthService);
  private readonly accounts = inject(AccountApiService);
  private readonly router = inject(Router);

  protected readonly email = computed(() => this.auth.user()?.email ?? '');
  protected readonly busy = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly infoMessage = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    // Spaces are allowed while typing, as in "482 913"; they are removed before checking.
    code: ['', [Validators.required, Validators.pattern(/^\s*(\d\s*){6}$/)]],
  });

  protected codeError(): string | null {
    const code = this.form.controls.code;
    if (!code.invalid || !code.touched) {
      return null;
    }
    return code.hasError('required') ? 'Please enter the 6-digit code from the email.' : 'The code has 6 digits, for example 123456.';
  }

  protected async verify(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.errorMessage.set(null);
    this.infoMessage.set(null);
    try {
      const code = this.form.getRawValue().code.replace(/\s/g, '');
      const response = await firstValueFrom(this.accounts.verify(this.email(), code));
      await this.auth.signIn(response.token);
      await this.router.navigate(['/']);
    } catch (error) {
      this.errorMessage.set(accountErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected async sendNewCode(): Promise<void> {
    this.busy.set(true);
    this.errorMessage.set(null);
    this.infoMessage.set(null);
    try {
      await firstValueFrom(this.accounts.resendCode(this.email()));
      this.infoMessage.set(`We sent a new code to ${this.email()}. It can take a minute to arrive.`);
    } catch (error) {
      this.errorMessage.set(accountErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected signOut(): void {
    this.auth.signOut();
  }
}
