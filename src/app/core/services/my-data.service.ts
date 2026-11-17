import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, concatMap, firstValueFrom, forkJoin, map, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { TokenResponse } from '../auth/account-api.service';
import { AccountData, MyData } from '../models/my-data.model';
import { Reply } from '../models/reply.model';

/** The patient's own data from both services: to see, download or delete it. */
@Injectable({ providedIn: 'root' })
export class MyDataService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  load(): Observable<MyData> {
    const account = this.auth.isPasswordAccount()
      ? this.http.get<AccountData>(`${environment.accountApiUrl}/accounts/me`)
      : of(null);
    return forkJoin([
      this.http.get<Omit<MyData, 'account' | 'replies'>>(`${environment.apiUrl}/me/data`),
      this.http.get<Reply[]>(`${environment.messagingApiUrl}/me/replies`),
      account,
    ]).pipe(map(([intakeData, replies, accountData]) => ({ ...intakeData, replies, account: accountData })));
  }

  /**
   * Corrects the name of a password account: the account first, which returns a token with the new name, then the
   * name on the questions. A Google user's name comes from Google.
   */
  async rename(name: string): Promise<void> {
    const response = await firstValueFrom(this.http.put<TokenResponse>(`${environment.accountApiUrl}/accounts/me`, { name }));
    await this.auth.signIn(response.token);
    await firstValueFrom(this.http.put<void>(`${environment.apiUrl}/me/data/name`, { name }));
  }

  /**
   * Replies first, while the questions still say whose they are; then the questions; then the account. If a step
   * fails, the account still exists, so the user can sign in and try again.
   */
  deleteEverything(): Observable<void> {
    return this.http.delete<void>(`${environment.messagingApiUrl}/me/replies`).pipe(
      concatMap(() => this.http.delete<void>(`${environment.apiUrl}/me/data`)),
      concatMap(() =>
        this.auth.isPasswordAccount() ? this.http.delete<void>(`${environment.accountApiUrl}/accounts/me`) : of(undefined),
      ),
    );
  }
}
