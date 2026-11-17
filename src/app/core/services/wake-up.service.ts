import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, catchError, merge } from 'rxjs';

import { environment } from '../../../environments/environment';

/**
 * The services sleep when nobody uses CareBridge and take a few seconds to start. Asking both if they are alive as
 * soon as the sign-in page opens starts them at the same time, while the user is still typing.
 */
@Injectable({ providedIn: 'root' })
export class WakeUpService {
  private readonly http = inject(HttpClient);
  private woken = false;

  wakeUp(): void {
    if (this.woken) {
      return;
    }
    this.woken = true;
    const ping = (baseUrl: string) => this.http.get(`${baseUrl}/actuator/health/liveness`).pipe(catchError(() => EMPTY));
    merge(ping(environment.apiUrl), ping(environment.accountApiUrl)).subscribe();
  }
}
