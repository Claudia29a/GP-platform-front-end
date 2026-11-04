import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

/** The patient's permission to use their data. */
@Injectable({ providedIn: 'root' })
export class PrivacyService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/privacy-consent`;

  allow(): Observable<void> {
    return this.http.post<void>(this.url, null);
  }

  withdraw(): Observable<void> {
    return this.http.delete<void>(this.url);
  }
}
