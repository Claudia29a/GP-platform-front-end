import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Intake, SubmitIntakeRequest } from '../models/intake.model';

@Injectable({ providedIn: 'root' })
export class IntakeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/intakes`;

  submit(request: SubmitIntakeRequest): Observable<Intake> {
    return this.http.post<Intake>(this.baseUrl, request);
  }

  getAll(): Observable<Intake[]> {
    return this.http.get<Intake[]>(this.baseUrl);
  }

  getById(id: string): Observable<Intake> {
    return this.http.get<Intake>(`${this.baseUrl}/${id}`);
  }
}
