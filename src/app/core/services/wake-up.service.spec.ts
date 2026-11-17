import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { WakeUpService } from './wake-up.service';

describe('[unit] WakeUpService', () => {
  let service: WakeUpService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(WakeUpService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('wakes both services at the same time', () => {
    service.wakeUp();

    http.expectOne(`${environment.apiUrl}/actuator/health/liveness`).flush({ status: 'UP' });
    http.expectOne(`${environment.accountApiUrl}/actuator/health/liveness`).flush({ status: 'UP' });
  });

  it('stays quiet when a service cannot be reached; signing in shows the real message', () => {
    const consoleError = vi.spyOn(console, 'error');

    service.wakeUp();
    http.expectOne(`${environment.apiUrl}/actuator/health/liveness`).flush(null, { status: 503, statusText: 'Unavailable' });
    http.expectOne(`${environment.accountApiUrl}/actuator/health/liveness`).error(new ProgressEvent('error'));

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('wakes the services only once per visit', () => {
    service.wakeUp();
    service.wakeUp();

    expect(http.match(`${environment.apiUrl}/actuator/health/liveness`)).toHaveLength(1);
    http.match(`${environment.accountApiUrl}/actuator/health/liveness`);
  });
});
