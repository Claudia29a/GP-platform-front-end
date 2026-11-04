import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { PrivacyService } from './privacy.service';

describe('[unit] PrivacyService', () => {
  let service: PrivacyService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PrivacyService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends the permission to the back-end', () => {
    service.allow().subscribe();

    const request = http.expectOne(`${environment.apiUrl}/privacy-consent`);
    expect(request.request.method).toBe('POST');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('withdraws the permission', () => {
    service.withdraw().subscribe();

    const request = http.expectOne(`${environment.apiUrl}/privacy-consent`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
});
