import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, concatMap, forkJoin, map, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { AccountData, MyData } from '../models/my-data.model';

/** The patient's own data from both services: to see, download or delete it. */
@Injectable({ providedIn: 'root' })
export class MyDataService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  load(): Observable<MyData> {
    const account = this.auth.isPasswordAccount()
      ? this.http.get<AccountData>(`${environment.accountApiUrl}/accounts/me`)
      : of(null);
    return forkJoin([this.http.get<Omit<MyData, 'account'>>(`${environment.apiUrl}/me/data`), account]).pipe(
      map(([intakeData, accountData]) => ({ ...intakeData, account: accountData })),
    );
  }

  /** Questions first: if that fails, the account still exists, so the user can sign in and try again. */
  deleteEverything(): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/me/data`).pipe(
      concatMap(() =>
        this.auth.isPasswordAccount() ? this.http.delete<void>(`${environment.accountApiUrl}/accounts/me`) : of(undefined),
      ),
    );
  }
}
