import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { Intake } from '../../../core/models/intake.model';
import { httpErrorMessage } from '../../../core/services/http-error-message';
import { IntakeService } from '../../../core/services/intake.service';

@Component({
  selector: 'app-intake-list',
  imports: [DatePipe, RouterLink],
  templateUrl: './intake-list.html',
  styleUrl: './intake-list.scss',
})
export class IntakeList implements OnInit {
  private readonly intakeService = inject(IntakeService);

  protected readonly intakes = signal<Intake[]>([]);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.intakeService
      .getAll()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (intakes) => this.intakes.set(intakes),
        error: (error) => this.errorMessage.set(httpErrorMessage(error)),
      });
  }
}
