import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { RuntimeConfigService } from './runtime-config.service';

describe('[unit] RuntimeConfigService', () => {
  let service: RuntimeConfigService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(RuntimeConfigService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the settings of this environment at start-up', async () => {
    const loading = service.load();
    http.expectOne('/config.json').flush({ googleClientId: 'client-of-this-environment' });
    await loading;

    expect(service.googleClientId).toBe('client-of-this-environment');
  });

  it('still lets the app start when the settings cannot be read, so email sign-in keeps working', async () => {
    const loading = service.load();
    http.expectOne('/config.json').flush(null, { status: 500, statusText: 'Server Error' });
    await loading;

    expect(service.googleClientId).toBeNull();
  });
});
