import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { SubmitIntakeRequest } from '../models/intake.model';
import { IntakeService } from './intake.service';

const request: SubmitIntakeRequest = {
  complaintArea: 'HEAD_NECK',
  complaintAreaOther: null,
  duration: 'ONE_TO_THREE_DAYS',
  severity: 3,
  symptoms: ['PAIN'],
  symptomsOther: null,
  takesMedication: false,
  currentMedication: null,
  triedTreatment: false,
  treatmentTried: null,
  description: 'Sore throat',
};

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
    service.submit(request).subscribe();

    const call = http.expectOne('/api/intakes');
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual(request);
    call.flush({});
  });

  it('gets one intake by id', () => {
    service.getById('abc').subscribe();

    const request = http.expectOne('/api/intakes/abc');
    expect(request.request.method).toBe('GET');
    request.flush({});
  });
});
