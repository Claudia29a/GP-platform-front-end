import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Intake } from '../../../core/models/intake.model';
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

  /** Bound from the :id route parameter. */
  readonly id = input.required<string>();

  protected readonly intake = signal<Intake | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.intakeService
      .getById(this.id())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (intake) => this.intake.set(intake),
        error: (error) => this.errorMessage.set(httpErrorMessage(error)),
      });
  }
}
