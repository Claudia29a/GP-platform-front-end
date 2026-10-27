import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { PATIENT } from '../../../testing/test-data';
import { AuthService } from '../../core/auth/auth.service';
import { GoogleIdentityService } from '../../core/auth/google-identity.service';
import { SignIn } from './sign-in';

describe('SignIn', () => {
  let auth: { signIn: ReturnType<typeof vi.fn>; sessionExpired: ReturnType<typeof signal<boolean>> };
  let google: { renderButton: ReturnType<typeof vi.fn> };
  let onGoogleSignIn: (token: string) => void;

  async function render(options: { expired?: boolean; googleFails?: boolean } = {}) {
    auth = { signIn: vi.fn().mockResolvedValue(PATIENT), sessionExpired: signal(options.expired ?? false) };
    google = {
      renderButton: vi.fn((_parent: HTMLElement, callback: (token: string) => void) => {
        onGoogleSignIn = callback;
        return options.googleFails ? Promise.reject(new Error('offline')) : Promise.resolve();
      }),
    };
    await TestBed.configureTestingModule({
      imports: [SignIn],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: GoogleIdentityService, useValue: google },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(SignIn);
    await fixture.whenStable();
    return { fixture, page: fixture.nativeElement as HTMLElement };
  }

  it('shows the Google button in its place', async () => {
    const { page } = await render();

    expect(google.renderButton).toHaveBeenCalledWith(page.querySelector('.google-button'), expect.any(Function));
  });

  it('signs in with the Google token and goes to the start page', async () => {
    const { fixture } = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    onGoogleSignIn('the-id-token');
    await fixture.whenStable();

    expect(auth.signIn).toHaveBeenCalledWith('the-id-token');
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('explains when the back-end refuses the sign-in', async () => {
    const { fixture, page } = await render();
    auth.signIn.mockRejectedValue(new HttpErrorResponse({ status: 0 }));

    onGoogleSignIn('the-id-token');
    await fixture.whenStable();

    expect(page.querySelector('.alert')?.textContent).toContain('cannot be reached');
  });

  it('explains when Google sign-in cannot be loaded', async () => {
    const { fixture, page } = await render({ googleFails: true });
    await fixture.whenStable();

    expect(page.querySelector('.alert')?.textContent).toContain('Google sign-in could not be loaded');
  });

  it('tells the user why they have to sign in again after the session ended', async () => {
    const { page } = await render({ expired: true });

    expect(page.querySelector('.info')?.textContent).toContain('Your session has ended');
  });
});
