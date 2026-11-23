import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { ReplyService } from './reply.service';

describe('[unit] ReplyService', () => {
  let service: ReplyService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ReplyService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the replies to a question from the Messaging Service', () => {
    service.getReplies('question-1').subscribe();

    expect(http.expectOne(`${environment.messagingApiUrl}/questions/question-1/replies`).request.method).toBe('GET');
  });

  it('sends a reply', () => {
    service.reply('question-1', 'Use the cream.', false).subscribe();

    const call = http.expectOne(`${environment.messagingApiUrl}/questions/question-1/replies`);
    expect(call.request.method).toBe('POST');
    expect(call.request.body).toEqual({ text: 'Use the cream.', appointment: false });
  });

  it('User story nr 9: sends whether the GP asks for an appointment, never a link', () => {
    service.reply('question-1', 'Please come in.', true).subscribe();

    expect(http.expectOne(`${environment.messagingApiUrl}/questions/question-1/replies`).request.body).toEqual({
      text: 'Please come in.',
      appointment: true,
    });
  });
});
