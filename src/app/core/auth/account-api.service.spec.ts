import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AccountApiService, accountErrorMessage } from './account-api.service';

describe('AccountApiService', () => {
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

  it('signs in and returns the token', () => {
    let token = '';
    service.login('bram@example.com', 'Secret12').subscribe((response) => (token = response.token));

    const call = http.expectOne('/api/account/login');
    expect(call.request.body).toEqual({ email: 'bram@example.com', password: 'Secret12' });
    call.flush({ token: 'carebridge-token', tokenType: 'Bearer', expiresIn: 3600 });
    expect(token).toBe('carebridge-token');
  });
});

describe('accountErrorMessage', () => {
  const forStatus = (status: number) => accountErrorMessage(new HttpErrorResponse({ status }));

  it('explains each answer of the Account Service', () => {
    expect(forStatus(401)).toBe('Email or password is incorrect.');
    expect(forStatus(409)).toContain('already exists');
    expect(forStatus(429)).toContain('15 minutes');
    expect(forStatus(400)).toContain('check the details');
  });

  it('falls back to the general messages', () => {
    expect(forStatus(0)).toContain('cannot be reached');
    expect(accountErrorMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
  });
});
