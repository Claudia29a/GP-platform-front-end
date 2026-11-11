import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { PATIENT } from '../../../testing/test-data';
import { AccountApiService } from '../../core/auth/account-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { CurrentUser } from '../../core/models/user.model';
import { VerifyEmail } from './verify-email';

describe('[component] VerifyEmail', () => {
  let fixture: ComponentFixture<VerifyEmail>;
  let page: HTMLElement;
  let auth: { user: ReturnType<typeof signal<CurrentUser | null>>; signIn: ReturnType<typeof vi.fn>; signOut: ReturnType<typeof vi.fn> };
  let accounts: { verify: ReturnType<typeof vi.fn>; resendCode: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    auth = {
      user: signal<CurrentUser | null>({ ...PATIENT, email: 'bram@example.com', emailVerified: false }),
      signIn: vi.fn().mockResolvedValue(PATIENT),
      signOut: vi.fn(),
    };
    accounts = {
      verify: vi.fn().mockReturnValue(of({ token: 'verified-token', tokenType: 'Bearer', expiresIn: 3600 })),
      resendCode: vi.fn().mockReturnValue(of(null)),
    };
    await TestBed.configureTestingModule({
      imports: [VerifyEmail],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: AccountApiService, useValue: accounts },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(VerifyEmail);
    page = fixture.nativeElement;
    await fixture.whenStable();
  });

  async function type(value: string): Promise<void> {
    const input = page.querySelector<HTMLInputElement>('#verify-code')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    page.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  async function clickNewCode(): Promise<void> {
    page.querySelector<HTMLButtonElement>('#resend-code')!.click();
    await fixture.whenStable();
  }

  const fieldError = () => page.querySelector('.error')?.textContent?.trim();

  it('tells the user where the code was sent and how long it works', () => {
    expect(page.querySelector('h1')?.textContent).toContain('Check your email');
    expect(page.textContent).toContain('bram@example.com');
    expect(page.textContent).toContain('15 minutes');
  });

  it('asks for the code before sending anything', async () => {
    await submit();

    expect(fieldError()).toBe('Please enter the 6-digit code from the email.');
    expect(accounts.verify).not.toHaveBeenCalled();
  });

  it('says when the code does not have 6 digits', async () => {
    await type('48a9');
    await submit();

    expect(fieldError()).toBe('The code has 6 digits, for example 123456.');
    expect(accounts.verify).not.toHaveBeenCalled();
  });

  it('verifies with the code, signs in with the new token and goes on', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    await type(' 482 913 ');
    await submit();

    expect(accounts.verify).toHaveBeenCalledWith('bram@example.com', '482913');
    expect(auth.signIn).toHaveBeenCalledWith('verified-token');
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('explains a wrong or expired code', async () => {
    accounts.verify.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, url: '/api/account/accounts/verify' })));

    await type('000000');
    await submit();

    expect(page.querySelector('[role=alert]')?.textContent).toContain('This code is not correct or has expired');
    expect(auth.signIn).not.toHaveBeenCalled();
  });

  it('confirms when a new code was sent', async () => {
    await clickNewCode();

    expect(accounts.resendCode).toHaveBeenCalledWith('bram@example.com');
    expect(page.querySelector('[role=status]')?.textContent).toContain('We sent a new code to bram@example.com');
  });

  it('says how long to wait before a new code', async () => {
    accounts.resendCode.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 429, url: '/api/account/accounts/verify/resend', headers: new HttpHeaders({ 'Retry-After': '30' }),
    })));

    await clickNewCode();

    expect(page.querySelector('[role=alert]')?.textContent).toContain('Please wait a minute before asking for a new code.');
  });

  it('lets the user sign out to use another address', async () => {
    page.querySelector<HTMLButtonElement>('#verify-sign-out')!.click();

    expect(auth.signOut).toHaveBeenCalled();
  });
});
