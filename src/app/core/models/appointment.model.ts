/** User story nr 10: a free time, with the day and time as the practice's clock shows them. */
export interface FreeSlot {
  start: string;
  day: string;
  time: string;
}

/** User story nr 10: a booked appointment. */
export interface Appointment {
  id: string;
  questionId: string;
  start: string;
  day: string;
  time: string;
  patientName: string;
}
