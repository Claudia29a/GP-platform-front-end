import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { PATIENT } from '../../../testing/test-data';
import { AccountApiService } from '../../core/auth/account-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { GoogleIdentityService } from '../../core/auth/google-identity.service';
import { SignIn } from './sign-in';

describe('SignIn', () => {
  let fixture: ComponentFixture<SignIn>;
  let page: HTMLElement;
  let auth: { signIn: ReturnType<typeof vi.fn>; sessionExpired: ReturnType<typeof signal<boolean>> };
  let google: { renderButton: ReturnType<typeof vi.fn> };
  let accounts: { register: ReturnType<typeof vi.fn>; login: ReturnType<typeof vi.fn> };
  let onGoogleSignIn: (token: string) => void;

  async function render(options: { expired?: boolean; googleFails?: boolean } = {}) {
    auth = { signIn: vi.fn().mockResolvedValue(PATIENT), sessionExpired: signal(options.expired ?? false) };
    google = {
      renderButton: vi.fn((_parent: HTMLElement, callback: (token: string) => void) => {
        onGoogleSignIn = callback;
        return options.googleFails ? Promise.reject(new Error('offline')) : Promise.resolve();
      }),
    };
    accounts = {
      register: vi.fn().mockReturnValue(of({})),
      login: vi.fn().mockReturnValue(of({ token: 'carebridge-token', tokenType: 'Bearer', expiresIn: 3600 })),
    };
    await TestBed.configureTestingModule({
      imports: [SignIn],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: GoogleIdentityService, useValue: google },
        { provide: AccountApiService, useValue: accounts },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(SignIn);
    page = fixture.nativeElement;
    await fixture.whenStable();
  }

  async function type(id: string, value: string): Promise<void> {
    const input = page.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    page.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  async function openCreateAccount(): Promise<void> {
    page.querySelector<HTMLButtonElement>('#tab-create')!.click();
    await fixture.whenStable();
  }

  const errors = () => Array.from(page.querySelectorAll('.error'), (el) => el.textContent!.trim());
  const rules = () => Array.from(page.querySelectorAll('.rules li'), (li) => ({ text: li.textContent!, met: li.classList.contains('met') }));

  describe('with Google', () => {
    it('shows the Google button in its place', async () => {
      await render();

      expect(google.renderButton).toHaveBeenCalledWith(page.querySelector('.google-button'), expect.any(Function));
    });

    it('signs in with the Google token and goes to the start page', async () => {
      await render();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      onGoogleSignIn('the-id-token');
      await fixture.whenStable();

      expect(auth.signIn).toHaveBeenCalledWith('the-id-token');
      expect(navigate).toHaveBeenCalledWith(['/']);
    });

    it('explains when the back-end cannot be reached', async () => {
      await render();
      auth.signIn.mockRejectedValue(new HttpErrorResponse({ status: 0 }));

      onGoogleSignIn('the-id-token');
      await fixture.whenStable();

      expect(page.querySelector('.alert')?.textContent).toContain('cannot be reached');
    });

    it('explains when Google sign-in cannot be loaded', async () => {
      await render({ googleFails: true });
      await fixture.whenStable();

      expect(page.querySelector('.alert')?.textContent).toContain('Google sign-in could not be loaded');
    });

    it('tells the user why they have to sign in again after the session ended', async () => {
      await render({ expired: true });

      expect(page.querySelector('.info')?.textContent).toContain('Your session has ended');
    });
  });

  describe('with email and password', () => {
    it('signs in with the token of the Account Service', async () => {
      await render();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      await type('signin-email', ' bram@example.com ');
      await type('signin-password', 'Secret12');
      await submit();

      expect(accounts.login).toHaveBeenCalledWith('bram@example.com', 'Secret12');
      expect(auth.signIn).toHaveBeenCalledWith('carebridge-token');
      expect(navigate).toHaveBeenCalledWith(['/']);
    });

    it('asks for an email address and password before sending anything', async () => {
      await render();

      await submit();

      expect(accounts.login).not.toHaveBeenCalled();
      expect(errors()).toEqual(['Please enter a valid email address.', 'Please enter your password.']);
    });

    it('says the same thing for a wrong email or a wrong password', async () => {
      await render();
      accounts.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));

      await type('signin-email', 'bram@example.com');
      await type('signin-password', 'Wrong123');
      await submit();

      expect(page.querySelector('.alert')?.textContent).toContain('Email or password is incorrect.');
      expect(auth.signIn).not.toHaveBeenCalled();
    });

    it('explains a temporary lock after too many wrong passwords', async () => {
      await render();
      accounts.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 429 })));

      await type('signin-email', 'bram@example.com');
      await type('signin-password', 'Wrong123');
      await submit();

      expect(page.querySelector('.alert')?.textContent).toContain('try again in 15 minutes');
    });
  });

  describe('creating an account', () => {
    it('shows the password rules and ticks them off while typing', async () => {
      await render();
      await openCreateAccount();

      expect(rules().map((rule) => rule.met)).toEqual([false, false, false]);
      await type('create-password', 'secret12');
      expect(rules().map((rule) => rule.met)).toEqual([true, false, true]);
      await type('create-password', 'Secret12');
      expect(rules().every((rule) => rule.met)).toBe(true);
      expect(rules()[1].text).toContain('At least one capital letter');
    });

    it('does not create an account with a weak password or two different passwords', async () => {
      await render();
      await openCreateAccount();

      await type('create-name', 'Bram');
      await type('create-email', 'bram@example.com');
      await type('create-password', 'secret');
      await type('create-confirm', 'other');
      await submit();

      expect(accounts.register).not.toHaveBeenCalled();
      expect(errors()).toContain('The passwords are not the same.');
    });

    it('creates the account and signs the new user in straight away', async () => {
      await render();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      await openCreateAccount();

      await type('create-name', ' Bram de Boer ');
      await type('create-email', 'bram@example.com');
      await type('create-password', 'Secret12');
      await type('create-confirm', 'Secret12');
      await submit();

      expect(accounts.register).toHaveBeenCalledWith('Bram de Boer', 'bram@example.com', 'Secret12');
      expect(accounts.login).toHaveBeenCalledWith('bram@example.com', 'Secret12');
      expect(auth.signIn).toHaveBeenCalledWith('carebridge-token');
      expect(navigate).toHaveBeenCalledWith(['/']);
    });

    it('tells the user when the email address already has an account', async () => {
      await render();
      accounts.register.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
      await openCreateAccount();

      await type('create-name', 'Bram');
      await type('create-email', 'bram@example.com');
      await type('create-password', 'Secret12');
      await type('create-confirm', 'Secret12');
      await submit();

      expect(page.querySelector('.alert')?.textContent).toContain('already exists');
      expect(accounts.login).not.toHaveBeenCalled();
    });

    it('clears an old error when switching tabs', async () => {
      await render();
      accounts.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
      await type('signin-email', 'bram@example.com');
      await type('signin-password', 'Wrong123');
      await submit();

      await openCreateAccount();

      expect(page.querySelector('.alert')).toBeNull();
    });
  });
});
