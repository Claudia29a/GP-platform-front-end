import { HttpErrorResponse, HttpHeaders, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AccountApiService, accountErrorMessage } from './account-api.service';

describe('[unit] AccountApiService', () => {
  let service: AccountApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AccountApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('creates an account at the Account Service', () => {
    service.register('Bram', 'bram@example.com', 'Secret12').subscribe();

    const call = http.expectOne('/api/account/accounts');
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual({ name: 'Bram', email: 'bram@example.com', password: 'Secret12' });
  });

  it('sends the code and returns the new token', () => {
    let token = '';
    service.verify('bram@example.com', '482913').subscribe((response) => (token = response.token));

    const call = http.expectOne('/api/account/accounts/verify');
    expect(call.request.body).toEqual({ email: 'bram@example.com', code: '482913' });
    call.flush({ token: 'verified-token', tokenType: 'Bearer', expiresIn: 3600 });
    expect(token).toBe('verified-token');
  });

  it('asks for a new code', () => {
    service.resendCode('bram@example.com').subscribe();

    const call = http.expectOne('/api/account/accounts/verify/resend');
    expect(call.request.body).toEqual({ email: 'bram@example.com' });
    call.flush(null, { status: 202, statusText: 'Accepted' });
  });

  it('signs in and returns the token', () => {
    let token = '';
    service.login('bram@example.com', 'Secret12').subscribe((response) => (token = response.token));

    const call = http.expectOne('/api/account/login');
    expect(call.request.body).toEqual({ email: 'bram@example.com', password: 'Secret12' });
    call.flush({ token: 'carebridge-token', tokenType: 'Bearer', expiresIn: 3600 });
    expect(token).toBe('carebridge-token');
  });
});

describe('[unit] accountErrorMessage', () => {
  const forStatus = (status: number) => accountErrorMessage(new HttpErrorResponse({ status }));

  it('explains each answer of the Account Service', () => {
    expect(forStatus(401)).toBe('Email or password is incorrect.');
    expect(forStatus(409)).toContain('already exists');
    expect(forStatus(429)).toContain('15 minutes');
    expect(forStatus(400)).toContain('check the details');
  });

  it('explains a refused sign-up, code or new code by what was asked', () => {
    const error = (status: number, url: string, retryAfter?: string) =>
      accountErrorMessage(new HttpErrorResponse({ status, url, headers: retryAfter ? new HttpHeaders({ 'Retry-After': retryAfter }) : undefined }));

    expect(error(429, '/api/account/accounts')).toBe('Too many accounts were created from this device. Please try again later.');
    expect(error(400, '/api/account/accounts/verify')).toBe(
      'This code is not correct or has expired. Please check the email or ask for a new code.',
    );
    expect(error(429, '/api/account/accounts/verify/resend', '40')).toBe('Please wait a minute before asking for a new code.');
    expect(error(429, '/api/account/accounts/verify/resend', '3000')).toBe(
      'You asked for many new codes. Please try again in 50 minutes.',
    );
    expect(error(429, '/api/account/login')).toContain('15 minutes');
  });

  it('falls back to the general messages', () => {
    expect(forStatus(0)).toContain('cannot be reached');
    expect(accountErrorMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
  });
});
