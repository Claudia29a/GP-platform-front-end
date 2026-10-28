import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { httpErrorMessage } from '../services/http-error-message';

export interface TokenResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
}

/** Sign-up and sign-in with email and password at the CareBridge Account Service (ADR-010). */
@Injectable({ providedIn: 'root' })
export class AccountApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.accountApiUrl;

  register(name: string, email: string, password: string): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/accounts`, { name, email, password });
  }

  login(email: string, password: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.baseUrl}/login`, { email, password });
  }
}

/** Plain-language messages for the answers of the Account Service. */
export function accountErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    switch (error.status) {
      case 401:
        return 'Email or password is incorrect.';
      case 409:
        return 'An account with this email address already exists. Please sign in instead.';
      case 429:
        return 'Too many wrong passwords. Please try again in 15 minutes.';
      case 400:
        return 'Please check the details you entered.';
    }
  }
  return httpErrorMessage(error);
}
