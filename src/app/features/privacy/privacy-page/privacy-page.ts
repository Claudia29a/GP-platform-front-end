import { Component, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { httpErrorMessage } from '../../../core/services/http-error-message';
import { PrivacyService } from '../../../core/services/privacy.service';

/** What happens to personal data (GDPR Article 13). Everyone can read it, also before signing in. */
@Component({
  selector: 'app-privacy-page',
  templateUrl: './privacy-page.html',
  styleUrl: './privacy-page.scss',
})
export class PrivacyPage {
  private readonly auth = inject(AuthService);
  private readonly privacy = inject(PrivacyService);

  protected readonly canWithdraw = computed(() => {
    const user = this.auth.user();
    return user?.role === 'PATIENT' && !user.privacyConsentNeeded;
  });
  protected readonly busy = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /** The permission popup comes back straight away, because nothing can be asked without it. */
  protected withdraw(): void {
    this.busy.set(true);
    this.errorMessage.set(null);
    this.privacy
      .withdraw()
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: () => this.auth.setPrivacyConsentNeeded(true),
        error: (error) => this.errorMessage.set(httpErrorMessage(error)),
      });
  }
}
