import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: { token: ReturnType<typeof vi.fn>; signOut: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    auth = { token: vi.fn().mockReturnValue('the-id-token'), signOut: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('sends the token to the CareBridge back-end', () => {
    http.get('/api/intakes').subscribe();

    expect(backend.expectOne('/api/intakes').request.headers.get('Authorization')).toBe('Bearer the-id-token');
  });

  it('never sends the token to other sites', () => {
    http.get('https://example.com/data').subscribe();

    expect(backend.expectOne('https://example.com/data').request.headers.has('Authorization')).toBe(false);
  });

  it('signs the user out when the back-end answers 401', () => {
    http.get('/api/intakes').subscribe({ error: () => undefined });
    backend.expectOne('/api/intakes').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.signOut).toHaveBeenCalledWith('expired');
  });
});
