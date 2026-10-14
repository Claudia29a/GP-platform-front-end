import { Component, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { GoogleIdentityService } from '../../core/auth/google-identity.service';
import { httpErrorMessage } from '../../core/services/http-error-message';

@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.scss',
})
export class SignIn {
  private readonly auth = inject(AuthService);
  private readonly google = inject(GoogleIdentityService);
  private readonly router = inject(Router);

  private readonly googleButton = viewChild.required<ElementRef<HTMLElement>>('googleButton');

  protected readonly sessionExpired = this.auth.sessionExpired;
  protected readonly signingIn = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    afterNextRender(() => {
      this.google
        .renderButton(this.googleButton().nativeElement, (token) => void this.complete(token))
        .catch(() => this.errorMessage.set('Google sign-in could not be loaded. Please check your connection and try again.'));
    });
  }

  private async complete(token: string): Promise<void> {
    this.signingIn.set(true);
    this.errorMessage.set(null);
    try {
      await this.auth.signIn(token);
      await this.router.navigate(['/']);
    } catch (error) {
      this.errorMessage.set(httpErrorMessage(error));
    } finally {
      this.signingIn.set(false);
    }
  }
}
