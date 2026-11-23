import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Appointment } from '../../core/models/appointment.model';
import { AppointmentService } from '../../core/services/appointment.service';
import { httpErrorMessage } from '../../core/services/http-error-message';

/** User story nr 10 AC6: the practice's appointments of one day, starting with today. */
export function today(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

@Component({
  selector: 'app-appointments-list',
  imports: [RouterLink],
  templateUrl: './appointments-list.html',
  styleUrl: './appointments-list.scss',
})
export class AppointmentsList {
  private readonly appointments = inject(AppointmentService);

  protected readonly day = signal(today());
  protected readonly list = signal<Appointment[] | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.load();
  }

  protected show(day: string): void {
    if (day) {
      this.day.set(day);
      this.load();
    }
  }

  private load(): void {
    this.errorMessage.set(null);
    this.appointments.onDay(this.day()).subscribe({
      next: (list) => this.list.set(list),
      error: (error) => this.errorMessage.set(httpErrorMessage(error)),
    });
  }
}
