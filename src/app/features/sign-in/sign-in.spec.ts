import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { PATIENT } from '../../../testing/test-data';
import { AccountApiService } from '../../core/auth/account-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { GoogleIdentityService } from '../../core/auth/google-identity.service';
import { WakeUpService } from '../../core/services/wake-up.service';
import { STARTING_HINT_AFTER_MS, SignIn } from './sign-in';

describe('[component] SignIn', () => {
  let fixture: ComponentFixture<SignIn>;
  let page: HTMLElement;
  let auth: {
    signIn: ReturnType<typeof vi.fn>;
    sessionExpired: ReturnType<typeof signal<boolean>>;
    privacyConsentDeclined: ReturnType<typeof signal<boolean>>;
    accountDeleted: ReturnType<typeof signal<boolean>>;
  };
  let google: { renderButton: ReturnType<typeof vi.fn> };
  let accounts: { register: ReturnType<typeof vi.fn>; login: ReturnType<typeof vi.fn> };
  let wakeUp: { wakeUp: ReturnType<typeof vi.fn> };
  let onGoogleSignIn: (token: string) => void;

  async function render(
    options: { expired?: boolean; declined?: boolean; deleted?: boolean; googleFails?: boolean; startingHintAfterMs?: number } = {},
  ) {
    auth = {
      signIn: vi.fn().mockResolvedValue(PATIENT),
      sessionExpired: signal(options.expired ?? false),
      privacyConsentDeclined: signal(options.declined ?? false),
      accountDeleted: signal(options.deleted ?? false),
    };
    google = {
      renderButton: vi.fn((_parent: HTMLElement, callback: (token: string) => void) => {
        onGoogleSignIn = callback;
        return options.googleFails ? Promise.reject(new Error('offline')) : Promise.resolve();
      }),
    };
    wakeUp = { wakeUp: vi.fn() };
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
        { provide: WakeUpService, useValue: wakeUp },
        { provide: STARTING_HINT_AFTER_MS, useValue: options.startingHintAfterMs ?? 3000 },
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

  async function chooseGoogle(): Promise<void> {
    page.querySelector<HTMLButtonElement>('#google-start')!.click();
    await fixture.whenStable();
  }

  async function openCreateAccount(): Promise<void> {
    page.querySelector<HTMLButtonElement>('#tab-create')!.click();
    await fixture.whenStable();
  }

  const errors = () => Array.from(page.querySelectorAll('.error'), (el) => el.textContent!.trim());
  const rules = () => Array.from(page.querySelectorAll('.rules li'), (li) => ({ text: li.textContent!, met: li.classList.contains('met') }));

  it('explains why a patient who did not allow the use of their data is back here', async () => {
    await render({ declined: true });

    expect(page.querySelector('.info')?.textContent).toContain('You have been signed out');
  });

  it('confirms that a deleted account is gone', async () => {
    await render({ deleted: true });

    expect(page.querySelector('.info')?.textContent).toContain('Your account and questions have been deleted.');
  });

  it('links to the privacy page', async () => {
    await render();

    expect(page.querySelector('.privacy a')?.getAttribute('href')).toBe('/privacy');
  });

  it('wakes the services as soon as the page opens, while the user is still typing', async () => {
    await render();

    expect(wakeUp.wakeUp).toHaveBeenCalled();
  });

  describe('while the services are starting', () => {
    const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    async function signInSlowly(answer: Subject<{ token: string; tokenType: string; expiresIn: number }>) {
      await render({ startingHintAfterMs: 20 });
      accounts.login.mockReturnValue(answer);
      await type('signin-email', 'bram@example.com');
      await type('signin-password', 'Secret12');
      page.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    }

    it('explains the wait when signing in takes more than a few seconds', async () => {
      await signInSlowly(new Subject());
      fixture.detectChanges();
      expect(page.querySelector('.starting')).toBeNull();

      await pause(60);
      fixture.detectChanges();

      expect(page.querySelector('.starting')?.textContent).toContain('Starting up CareBridge');
    });

    it('removes the explanation once signing in is done', async () => {
      const answer = new Subject<{ token: string; tokenType: string; expiresIn: number }>();
      await signInSlowly(answer);
      vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      await pause(60);

      answer.next({ token: 'carebridge-token', tokenType: 'Bearer', expiresIn: 3600 });
      answer.complete();
      await pause(20);
      fixture.detectChanges();

      expect(auth.signIn).toHaveBeenCalledWith('carebridge-token');
      expect(page.querySelector('.starting')).toBeNull();
    });
  });

  describe('with Google', () => {
    it('loads nothing from Google until the user chooses Google', async () => {
      await render();

      expect(google.renderButton).not.toHaveBeenCalled();
      expect(page.querySelector('#google-start')?.textContent).toContain('Continue with Google');
    });

    it("shows Google's button in its place after choosing Google", async () => {
      await render();

      await chooseGoogle();

      expect(google.renderButton).toHaveBeenCalledWith(page.querySelector('.google-button'), expect.any(Function));
      expect(page.querySelector('#google-start')).toBeNull();
    });

    it('signs in with the Google token and goes to the start page', async () => {
      await render();
      await chooseGoogle();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      onGoogleSignIn('the-id-token');
      await fixture.whenStable();

      expect(auth.signIn).toHaveBeenCalledWith('the-id-token');
      expect(navigate).toHaveBeenCalledWith(['/']);
    });

    it('explains when the back-end cannot be reached', async () => {
      await render();
      await chooseGoogle();
      auth.signIn.mockRejectedValue(new HttpErrorResponse({ status: 0 }));

      onGoogleSignIn('the-id-token');
      await fixture.whenStable();

      expect(page.querySelector('.alert')?.textContent).toContain('cannot be reached');
    });

    it('explains when Google sign-in cannot be loaded', async () => {
      await render({ googleFails: true });
      await chooseGoogle();

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
      expect(errors()).toEqual(['Please enter your email address.', 'Please enter your password.']);
    });

    it('says when the email address is mistyped', async () => {
      await render();

      await type('signin-email', 'not-an-email');
      await submit();

      expect(errors()).toContain('Please enter a valid email address.');
      expect(accounts.login).not.toHaveBeenCalled();
    });

    it('scrolls a sign-in error into view, so it is seen on a small screen', async () => {
      await render();
      const scrollIntoView = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      accounts.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));

      await type('signin-email', 'bram@example.com');
      await type('signin-password', 'Wrong123');
      await submit();

      expect(scrollIntoView).toHaveBeenCalled();
      delete (Element.prototype as Partial<Element>).scrollIntoView;
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

    it('explains when the address cannot receive email', async () => {
      await render();
      accounts.register.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 422, url: '/api/account/accounts' })));
      await openCreateAccount();

      await type('create-name', 'Bram');
      await type('create-email', 'bram@gmial.con');
      await type('create-password', 'Secret12');
      await type('create-confirm', 'Secret12');
      await submit();

      expect(page.querySelector('.alert')?.textContent).toContain('Please check it for typos');
      expect(accounts.login).not.toHaveBeenCalled();
    });

    it('explains when too many accounts were created from this device', async () => {
      await render();
      accounts.register.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 429, url: '/api/account/accounts' })));
      await openCreateAccount();

      await type('create-name', 'Bram');
      await type('create-email', 'bram@example.com');
      await type('create-password', 'Secret12');
      await type('create-confirm', 'Secret12');
      await submit();

      expect(page.querySelector('.alert')?.textContent).toContain('Too many accounts were created from this device');
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
