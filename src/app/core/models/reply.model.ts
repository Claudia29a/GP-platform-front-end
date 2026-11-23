/** The GP's reply to a question, from the Messaging Service. */
export interface Reply {
  id: string;
  questionId: string;
  authorName: string;
  text: string;
  createdAt: string;
  /** User story nr 9: the GP asked the patient to make an appointment. */
  appointment: boolean;
  /** The practice's booking page, from the Messaging Service's settings; only when {@link appointment} is true. */
  appointmentUrl?: string | null;
}

export const MAX_REPLY_LENGTH = 2000;
