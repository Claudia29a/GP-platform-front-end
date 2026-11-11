import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { MyData } from '../models/my-data.model';
import { MyDataService } from './my-data.service';

describe('[unit] MyDataService', () => {
  let service: MyDataService;
  let http: HttpTestingController;
  let passwordAccount: boolean;

  const intakeData = {
    user: { id: 'account-1', name: 'Anna', email: 'anna@example.com' },
    privacyConsent: { version: '2026-11-11', acceptedAt: '2026-11-11T10:00:00Z' },
    questions: [],
  };

  beforeEach(() => {
    passwordAccount = true;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { isPasswordAccount: () => passwordAccount } },
      ],
    });
    service = TestBed.inject(MyDataService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('combines what both services store about a password account', () => {
    let data: MyData | undefined;
    service.load().subscribe((result) => (data = result));

    http.expectOne(`${environment.apiUrl}/me/data`).flush(intakeData);
    http.expectOne(`${environment.accountApiUrl}/accounts/me`)
      .flush({ name: 'Anna', email: 'anna@example.com', emailVerified: true, createdAt: '2026-11-01T09:00:00Z' });

    expect(data?.account?.createdAt).toBe('2026-11-01T09:00:00Z');
    expect(data?.privacyConsent?.version).toBe('2026-11-11');
  });

  it('asks only the Intake Service about a Google user, who has no CareBridge account', () => {
    passwordAccount = false;
    let data: MyData | undefined;
    service.load().subscribe((result) => (data = result));

    http.expectOne(`${environment.apiUrl}/me/data`).flush(intakeData);

    expect(data?.account).toBeNull();
  });

  it('deletes the questions first, then the account', () => {
    let done = false;
    service.deleteEverything().subscribe(() => (done = true));

    http.expectOne({ method: 'DELETE', url: `${environment.apiUrl}/me/data` }).flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne({ method: 'DELETE', url: `${environment.accountApiUrl}/accounts/me` }).flush(null, { status: 204, statusText: 'No Content' });

    expect(done).toBe(true);
  });

  it('keeps the account when deleting the questions failed, so nothing is half deleted without notice', () => {
    let failed = false;
    service.deleteEverything().subscribe({ error: () => (failed = true) });

    http.expectOne(`${environment.apiUrl}/me/data`).flush(null, { status: 500, statusText: 'Server Error' });

    expect(failed).toBe(true);
  });
});
