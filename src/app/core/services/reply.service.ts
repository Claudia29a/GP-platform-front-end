import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Reply } from '../models/reply.model';

/** The GP's replies, kept by the Messaging Service. */
@Injectable({ providedIn: 'root' })
export class ReplyService {
  private readonly http = inject(HttpClient);

  getReplies(questionId: string): Observable<Reply[]> {
    return this.http.get<Reply[]>(`${environment.messagingApiUrl}/questions/${questionId}/replies`);
  }

  reply(questionId: string, text: string): Observable<Reply> {
    return this.http.post<Reply>(`${environment.messagingApiUrl}/questions/${questionId}/replies`, { text });
  }
}
