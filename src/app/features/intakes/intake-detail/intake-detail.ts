import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { Intake, STATUS_LABELS, areaLabel, durationLabel, symptomLabels } from '../../../core/models/intake.model';
import { AccessLogEntry } from '../../../core/models/my-data.model';
import { ROLE_LABELS } from '../../../core/models/user.model';
import { httpErrorMessage } from '../../../core/services/http-error-message';
import { IntakeService } from '../../../core/services/intake.service';

@Component({
  selector: 'app-intake-detail',
  imports: [DatePipe, RouterLink],
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

  /** Bound from the :id route parameter. */
  readonly id = input.required<string>();

  protected readonly intake = signal<Intake | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  /** Only filled for the GP (GDPR Art. 32; NEN 7513). */
  protected readonly accessLog = signal<AccessLogEntry[] | null>(null);

  ngOnInit(): void {
    this.intakeService
      .getById(this.id())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (intake) => {
          this.intake.set(intake);
          // Loaded after the question, so this opening is already in the log.
          if (this.auth.user()?.role === 'GP') {
            this.intakeService.getAccessLog(this.id()).subscribe({ next: (log) => this.accessLog.set(log), error: () => this.accessLog.set(null) });
          }
        },
        error: (error) => this.errorMessage.set(httpErrorMessage(error)),
      });
  }
}
