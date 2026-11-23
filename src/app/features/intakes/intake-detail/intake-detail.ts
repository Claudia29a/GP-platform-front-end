import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { Intake, STATUS_LABELS, areaLabel, durationLabel, symptomLabels } from '../../../core/models/intake.model';
import { AccessLogEntry } from '../../../core/models/my-data.model';
import { waitingTime } from '../../../core/models/queue.model';
import { ROLE_LABELS } from '../../../core/models/user.model';
import { httpErrorMessage } from '../../../core/services/http-error-message';
import { IntakeService } from '../../../core/services/intake.service';
import { MAX_REPLY_LENGTH, Reply } from '../../../core/models/reply.model';
import { ReplyService } from '../../../core/services/reply.service';

@Component({
  selector: 'app-intake-detail',
  imports: [DatePipe, NgTemplateOutlet, RouterLink, ReactiveFormsModule],
  templateUrl: './intake-detail.html',
  styleUrl: './intake-detail.scss',
})
export class IntakeDetail implements OnInit {
  private readonly intakeService = inject(IntakeService);

  private readonly auth = inject(AuthService);
  protected readonly isStaff = this.auth.isStaff;
  protected readonly roleLabels = ROLE_LABELS;

  protected readonly areaLabel = areaLabel;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly durationLabel = durationLabel;
  protected readonly symptomLabels = symptomLabels;
  protected readonly waitingTime = waitingTime;
  /** The waiting time in the summary is counted from when the page opened. */
  protected readonly now = new Date();

  /** Bound from the :id route parameter. */
  readonly id = input.required<string>();

  protected readonly intake = signal<Intake | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  /** Only filled for the GP (GDPR Art. 32; NEN 7513). */
  protected readonly accessLog = signal<AccessLogEntry[] | null>(null);

  private readonly replyService = inject(ReplyService);
  protected readonly replies = signal<Reply[]>([]);
  /** Only the GP answers questions; the Messaging Service checks the same. */
  protected readonly canReply = computed(() => this.auth.user()?.role === 'GP');
  protected readonly replyText = inject(NonNullableFormBuilder).control('');
  protected readonly replyError = signal<string | null>(null);
  protected readonly replyMessage = signal<string | null>(null);
  protected readonly replyFailure = signal<string | null>(null);
  protected readonly sending = signal(false);
  protected readonly maxReplyLength = MAX_REPLY_LENGTH;

  ngOnInit(): void {
    this.intakeService
      .getById(this.id())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (intake) => {
          this.intake.set(intake);
          this.replyService.getReplies(this.id()).subscribe({ next: (replies) => this.replies.set(replies), error: () => this.replies.set([]) });
          // Loaded after the question, so this opening is already in the log.
          if (this.auth.user()?.role === 'GP') {
            this.intakeService.getAccessLog(this.id()).subscribe({ next: (log) => this.accessLog.set(log), error: () => this.accessLog.set(null) });
          }
        },
        error: (error) => this.errorMessage.set(httpErrorMessage(error)),
      });
  }

  protected sendReply(): void {
    const text = this.replyText.value.trim();
    this.replyMessage.set(null);
    this.replyFailure.set(null);
    if (!text) {
      this.replyError.set('Please write a reply.');
      return;
    }
    if (text.length > MAX_REPLY_LENGTH) {
      this.replyError.set(`A reply can be at most ${MAX_REPLY_LENGTH} characters.`);
      return;
    }
    this.replyError.set(null);
    this.sending.set(true);
    this.replyService
      .reply(this.id(), text)
      .pipe(finalize(() => this.sending.set(false)))
      .subscribe({
        next: (reply) => {
          this.replies.update((replies) => [...replies, reply]);
          this.replyText.reset();
          this.replyMessage.set('Your reply was sent. The patient gets an email to sign in and read it.');
        },
        error: (error) => this.replyFailure.set(httpErrorMessage(error)),
      });
  }
}
