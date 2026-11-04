import { Injectable, inject } from '@angular/core';

import { RuntimeConfigService } from '../config/runtime-config.service';

/** The small part of Google Identity Services (https://accounts.google.com/gsi/client) that CareBridge uses. */
interface GoogleAccountsId {
  initialize(config: { client_id: string; callback: (response: { credential: string }) => void }): void;
  renderButton(parent: HTMLElement, options: Record<string, string | number>): void;
  disableAutoSelect(): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

/** `hl=en`: the button text follows this language, not the browser's. */
const SCRIPT_URL = 'https://accounts.google.com/gsi/client?hl=en';

/** Loads Google's sign-in script once and shows the "Sign in with Google" button. */
@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
  private readonly config = inject(RuntimeConfigService);
  private loading?: Promise<GoogleAccountsId>;

  async renderButton(parent: HTMLElement, onSignIn: (idToken: string) => void): Promise<void> {
    const clientId = this.config.googleClientId;
    if (!clientId) {
      throw new Error('Google sign-in is not configured');
    }
    const google = await this.load();
    google.initialize({
      client_id: clientId,
      callback: (response) => onSignIn(response.credential),
    });
    google.renderButton(parent, { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', width: 280, locale: 'en' });
  }

  /** After signing out, Google must not sign the same account in again automatically. */
  disableAutoSelect(): void {
    window.google?.accounts.id.disableAutoSelect();
  }

  private load(): Promise<GoogleAccountsId> {
    this.loading ??= new Promise((resolve, reject) => {
      if (window.google) {
        resolve(window.google.accounts.id);
        return;
      }
      const script = document.createElement('script');
      script.src = SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve(window.google!.accounts.id);
      script.onerror = () => {
        this.loading = undefined;
        reject(new Error('Google sign-in could not be loaded'));
      };
      document.head.appendChild(script);
    });
    return this.loading;
  }
}
