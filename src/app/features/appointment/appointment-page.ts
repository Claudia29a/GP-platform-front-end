import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { FreeSlot } from '../../core/models/appointment.model';
import { AppointmentService } from '../../core/services/appointment.service';
import { httpErrorMessage } from '../../core/services/http-error-message';

/**
 * User story nr 10: the patient picks a free time for the GP's invitation. The link in the email and the button under
 * the reply carry the invitation as ?reply=. A practice with its own booking system links there instead.
 */
@Component({
  selector: 'app-appointment-page',
  imports: [RouterLink],
  templateUrl: './appointment-page.html',
  styleUrl: './appointment-page.scss',
})
export class AppointmentPage {
  private readonly appointments = inject(AppointmentService);
  private readonly router = inject(Router);

  /** The invitation (a reply), from the ?reply= in the link. */
  readonly reply = input<string>();

  protected readonly slots = signal<FreeSlot[] | null>(null);
  protected readonly chosen = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly busy = signal(false);

  /** The free times per day, in the order the server gives them. */
  protected readonly days = computed(() => {
    const days: { day: string; slots: FreeSlot[] }[] = [];
    for (const slot of this.slots() ?? []) {
      const last = days.at(-1);
      if (last?.day === slot.day) {
        last.slots.push(slot);
      } else {
        days.push({ day: slot.day, slots: [slot] });
      }
    }
    return days;
  });

  protected readonly chosenLabel = computed(() => {
    const slot = this.slots()?.find((candidate) => candidate.start === this.chosen());
    return slot ? `${slot.day} at ${slot.time}` : 'No time chosen yet';
  });

  constructor() {
    effect(() => {
      if (this.reply()) {
        untracked(() => this.loadFree());
      }
    });
  }

  protected book(): void {
    const reply = this.reply();
    const start = this.chosen();
    if (!reply || !start) {
      this.errorMessage.set('Please choose a time.');
      return;
    }
    this.errorMessage.set(null);
    this.busy.set(true);
    this.appointments
      .book(reply, start)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (appointment) => void this.router.navigate(['/questions', appointment.questionId]),
        error: (error: unknown) => {
          this.errorMessage.set(bookingError(error));
          this.chosen.set(null);
          this.loadFree();
        },
      });
  }

  private loadFree(): void {
    this.appointments.free().subscribe({
      next: (slots) => this.slots.set(slots),
      error: (error) => this.errorMessage.set(httpErrorMessage(error)),
    });
  }
}

/** The server explains why a booking failed, for example a time just taken by someone else. */
function bookingError(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 404) {
    return 'You can make an appointment once your GP has invited you.';
  }
  const reason =
    error instanceof HttpErrorResponse
      ? (error.error as { message?: string } | null)?.message
      : null;
  return reason || httpErrorMessage(error);
}
