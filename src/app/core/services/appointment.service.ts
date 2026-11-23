import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Appointment, FreeSlot } from '../models/appointment.model';

/** User story nr 10: booking appointments, kept by the Messaging Service. */
@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.messagingApiUrl;

  free(): Observable<FreeSlot[]> {
    return this.http.get<FreeSlot[]>(`${this.api}/appointments/free`);
  }

  book(replyId: string, start: string): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.api}/replies/${replyId}/appointment`, { start });
  }

  cancel(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/appointments/${id}`);
  }

  /** The practice's appointments of one day, as YYYY-MM-DD. */
  onDay(day: string): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.api}/appointments`, { params: { day } });
  }
}
