import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * User story nr 9: the simple booking page the GP's invitation links to. A real practice sets APPOINTMENT_URL in the
 * Messaging Service to its own booking system instead. Everyone can open it: it contains no personal data.
 */
@Component({
  selector: 'app-appointment-page',
  imports: [RouterLink],
  templateUrl: './appointment-page.html',
  styleUrl: './appointment-page.scss',
})
export class AppointmentPage {}
