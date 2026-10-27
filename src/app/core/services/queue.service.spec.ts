import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { QueueService } from './queue.service';

describe('QueueService', () => {
  let service: QueueService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(QueueService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the queue', () => {
    service.getQueue().subscribe();

    expect(http.expectOne('/api/queue').request.method).toBe('GET');
  });

  it('saves a new order as a list of question ids', () => {
    service.saveOrder(['b', 'a']).subscribe();

    const call = http.expectOne('/api/queue/order');
    expect(call.request.method).toBe('PUT');
    expect(call.request.body).toEqual({ intakeIds: ['b', 'a'] });
  });
});
