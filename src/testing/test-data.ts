import { Intake } from '../app/core/models/intake.model';
import { CurrentUser } from '../app/core/models/user.model';

/** Shared test data, so every spec uses the same realistic question and users. */
export function testIntake(overrides: Partial<Intake> = {}): Intake {
  return {
    id: '3f1c2a4e-0000-4000-8000-000000000001',
    patientId: 'google-anna',
    patientName: 'Anna de Vries',
    patientEmail: 'anna@example.com',
    complaintArea: 'SKIN',
    complaintAreaOther: null,
    duration: 'ONE_TO_FOUR_WEEKS',
    severity: 4,
    symptoms: ['RASH_ITCHING', 'SWELLING'],
    symptomsOther: null,
    takesMedication: true,
    currentMedication: 'Antihistamine',
    triedTreatment: false,
    treatmentTried: null,
    description: 'Itchy rash on my left arm',
    status: 'SUBMITTED',
    submittedAt: '2026-10-14T09:00:00Z',
    ...overrides,
  };
}

export const PATIENT: CurrentUser = { id: 'google-anna', name: 'Anna de Vries', email: 'anna@example.com', role: 'PATIENT' };
export const ASSISTANT: CurrentUser = { id: 'google-sam', name: 'Sam Bakker', email: 'sam@example.com', role: 'GP_ASSISTANT' };
export const GP: CurrentUser = { id: 'google-gp', name: 'Dr. Jansen', email: 'gp@example.com', role: 'GP' };
