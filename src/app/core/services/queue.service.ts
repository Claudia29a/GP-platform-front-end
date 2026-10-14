import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { QueueItem } from '../models/queue.model';

@Injectable({ providedIn: 'root' })
export class QueueService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/queue`;

  getQueue(): Observable<QueueItem[]> {
    return this.http.get<QueueItem[]>(this.baseUrl);
  }

  /** Saves a manual order; the back-end answers 409 when the queue changed in the meantime. */
  saveOrder(intakeIds: string[]): Observable<QueueItem[]> {
    return this.http.put<QueueItem[]>(`${this.baseUrl}/order`, { intakeIds });
  }
}
