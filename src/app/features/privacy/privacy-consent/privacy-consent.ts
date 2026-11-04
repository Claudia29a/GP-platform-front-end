import { Component, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { httpErrorMessage } from '../../../core/services/http-error-message';
import { PrivacyService } from '../../../core/services/privacy.service';

/** Shown to a patient after signing in, until they allowed the use of their data. */
@Component({
  selector: 'app-privacy-consent',
  imports: [RouterLink],
  templateUrl: './privacy-consent.html',
  styleUrl: './privacy-consent.scss',
})
export class PrivacyConsent {
  private readonly auth = inject(AuthService);
  private readonly privacy = inject(PrivacyService);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly busy = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    afterNextRender(() => this.open());
  }

  /** A browser can close a dialog by itself, for example on a second Escape; a choice is still needed. */
  protected open(): void {
    this.dialog().nativeElement.showModal?.();
  }

  protected allow(): void {
    this.busy.set(true);
    this.errorMessage.set(null);
    this.privacy
      .allow()
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => this.auth.setPrivacyConsentNeeded(false),
        error: (error) => this.errorMessage.set(httpErrorMessage(error)),
      });
  }

  protected decline(): void {
    this.auth.signOut('consent-declined');
  }
}
