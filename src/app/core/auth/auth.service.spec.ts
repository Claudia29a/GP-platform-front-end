import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { CurrentUser } from '../models/user.model';
import { AuthService, isExpired } from './auth.service';
import { GoogleIdentityService } from './google-identity.service';

/** A token with only the parts AuthService reads; the signature is checked by the back-end, not here. */
function tokenExpiringAt(epochSeconds: number): string {
  const payload = btoa(JSON.stringify({ exp: epochSeconds })).replace(/=+$/, '');
  return `header.${payload}.signature`;
}

describe('isExpired', () => {
  const now = Date.parse('2026-10-14T12:00:00Z');

  it('is false before the expiry time', () => {
    expect(isExpired(tokenExpiringAt(now / 1000 + 60), now)).toBe(false);
  });

  it('is true after the expiry time', () => {
    expect(isExpired(tokenExpiringAt(now / 1000 - 1), now)).toBe(true);
  });

  it('treats an unreadable token as expired', () => {
    expect(isExpired('not-a-token', now)).toBe(true);
  });
});

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let google: { disableAutoSelect: ReturnType<typeof vi.fn> };
  const gp: CurrentUser = { id: 'google-gp', name: 'Dr. Jansen', email: 'gp@example.com', role: 'GP' };

  beforeEach(() => {
    sessionStorage.clear();
    google = { disableAutoSelect: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: GoogleIdentityService, useValue: google },
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('signs in with the Google token and loads the user and role', async () => {
    const token = tokenExpiringAt(Date.now() / 1000 + 3600);
    const signedIn = auth.signIn(token);
    http.expectOne('/api/me').flush(gp);

    expect(await signedIn).toEqual(gp);
    expect(auth.isSignedIn()).toBe(true);
    expect(auth.isStaff()).toBe(true);
    expect(auth.token()).toBe(token);
  });

  it('does not restore an expired session after a refresh', async () => {
    sessionStorage.setItem('carebridge.idToken', tokenExpiringAt(Date.now() / 1000 - 10));

    await auth.restore();

    http.expectNone('/api/me');
    expect(auth.isSignedIn()).toBe(false);
    expect(sessionStorage.getItem('carebridge.idToken')).toBeNull();
  });

  it('signs out, forgets the token and goes to the sign-in page', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const signedIn = auth.signIn(tokenExpiringAt(Date.now() / 1000 + 3600));
    http.expectOne('/api/me').flush(gp);
    await signedIn;

    auth.signOut('expired');

    expect(auth.isSignedIn()).toBe(false);
    expect(auth.token()).toBeNull();
    expect(auth.sessionExpired()).toBe(true);
    expect(google.disableAutoSelect).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/sign-in']);
  });
});
