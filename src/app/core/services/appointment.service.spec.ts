import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { AppointmentService } from './appointment.service';

describe('[unit] AppointmentService', () => {
  let service: AppointmentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AppointmentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('User story nr 10: reads the free times', () => {
    service.free().subscribe();

    expect(http.expectOne(`${environment.messagingApiUrl}/appointments/free`).request.method).toBe(
      'GET',
    );
  });

  it('User story nr 10: books the chosen time for the invitation', () => {
    service.book('reply-1', '2026-12-01T09:00:00Z').subscribe();

    const call = http.expectOne(`${environment.messagingApiUrl}/replies/reply-1/appointment`);
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual({ start: '2026-12-01T09:00:00Z' });
  });

  it('User story nr 10: cancels an appointment', () => {
    service.cancel('appointment-1').subscribe();

    expect(
      http.expectOne(`${environment.messagingApiUrl}/appointments/appointment-1`).request.method,
    ).toBe('DELETE');
  });

  it("User story nr 10: reads the practice's appointments of one day", () => {
    service.onDay('2026-12-01').subscribe();

    expect(
      http.expectOne(`${environment.messagingApiUrl}/appointments?day=2026-12-01`).request.method,
    ).toBe('GET');
  });
});
