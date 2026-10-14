export type IntakeStatus = 'SUBMITTED';

export interface Intake {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  description: string;
  status: IntakeStatus;
  submittedAt: string;
}

export interface SubmitIntakeRequest {
  description: string;
}

/** Must match IntakeService.MAX_DESCRIPTION_LENGTH in the back-end. */
export const MAX_DESCRIPTION_LENGTH = 1000;
