import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { IntakeService } from './intake.service';

describe('IntakeService', () => {
  let service: IntakeService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(IntakeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('posts a new intake to the back-end', () => {
    service.submit({ description: 'Sore throat' }).subscribe();

    const request = http.expectOne('/api/intakes');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ description: 'Sore throat' });
    request.flush({});
  });

  it('gets one intake by id', () => {
    service.getById('abc').subscribe();

    const request = http.expectOne('/api/intakes/abc');
    expect(request.request.method).toBe('GET');
    request.flush({});
  });
});
