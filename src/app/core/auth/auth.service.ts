import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CurrentUser, isStaff } from '../models/user.model';
import { GoogleIdentityService } from './google-identity.service';

const TOKEN_KEY = 'carebridge.idToken';

/**
 * Keeps the Google ID token and the signed-in user (ADR-006).
 * The token lives in sessionStorage, so it survives a page refresh but not closing the tab.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly google = inject(GoogleIdentityService);

  private readonly idToken = signal<string | null>(null);
  private readonly currentUser = signal<CurrentUser | null>(null);

  readonly user = this.currentUser.asReadonly();
  readonly isSignedIn = computed(() => this.currentUser() !== null);
  readonly isStaff = computed(() => isStaff(this.currentUser()));
  /** Set when the session ended because the token expired, so the sign-in page can say why. */
  readonly sessionExpired = signal(false);

  token(): string | null {
    return this.idToken();
  }

  /** Runs once at start-up: picks up a session from before a page refresh if its token is still valid. */
  async restore(): Promise<void> {
    const token = readToken();
    if (!token || isExpired(token)) {
      clearToken();
      return;
    }
    this.idToken.set(token);
    try {
      await this.loadUser();
    } catch {
      this.clear();
    }
  }

  /** Called with the ID token Google returns after the user signs in. */
  async signIn(token: string): Promise<CurrentUser> {
    this.idToken.set(token);
    saveToken(token);
    this.sessionExpired.set(false);
    try {
      return await this.loadUser();
    } catch (error) {
      this.clear();
      throw error;
    }
  }

  signOut(reason?: 'expired'): void {
    this.clear();
    this.google.disableAutoSelect();
    this.sessionExpired.set(reason === 'expired');
    void this.router.navigate(['/sign-in']);
  }

  private async loadUser(): Promise<CurrentUser> {
    const user = await firstValueFrom(this.http.get<CurrentUser>(`${environment.apiUrl}/me`));
    this.currentUser.set(user);
    return user;
  }

  private clear(): void {
    this.idToken.set(null);
    this.currentUser.set(null);
    clearToken();
  }
}

/** True when the token's expiry time (the "exp" claim) has passed. */
export function isExpired(token: string, now = Date.now()): boolean {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload)) as { exp?: number };
    return typeof exp !== 'number' || exp * 1000 <= now;
  } catch {
    return true;
  }
}

function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function saveToken(token: string): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Without storage the session simply ends on refresh.
  }
}

function clearToken(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing stored.
  }
}
