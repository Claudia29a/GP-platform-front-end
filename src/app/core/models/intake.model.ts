export type IntakeStatus = 'SUBMITTED';

export type ComplaintArea =
  | 'HEAD_NECK'
  | 'CHEST_BREATHING'
  | 'STOMACH_DIGESTION'
  | 'BACK_JOINTS'
  | 'ARMS_LEGS'
  | 'SKIN'
  | 'MENTAL_HEALTH'
  | 'OTHER';

export type ComplaintDuration =
  | 'LESS_THAN_A_DAY'
  | 'ONE_TO_THREE_DAYS'
  | 'FOUR_TO_SEVEN_DAYS'
  | 'ONE_TO_FOUR_WEEKS'
  | 'MORE_THAN_A_MONTH';

export type Symptom =
  | 'FEVER'
  | 'PAIN'
  | 'SWELLING'
  | 'RASH_ITCHING'
  | 'COUGH'
  | 'TIREDNESS'
  | 'NAUSEA_VOMITING'
  | 'DIZZINESS'
  | 'TROUBLE_SLEEPING';

export interface Intake {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  complaintArea: ComplaintArea;
  complaintAreaOther: string | null;
  duration: ComplaintDuration;
  severity: number;
  symptoms: Symptom[];
  symptomsOther: string | null;
  takesMedication: boolean;
  currentMedication: string | null;
  triedTreatment: boolean;
  treatmentTried: string | null;
  description: string;
  status: IntakeStatus;
  submittedAt: string;
}

/** The patient's answers; who the patient is comes from the sign-in token. */
export interface SubmitIntakeRequest {
  complaintArea: ComplaintArea;
  complaintAreaOther: string | null;
  duration: ComplaintDuration;
  severity: number;
  symptoms: Symptom[];
  symptomsOther: string | null;
  takesMedication: boolean;
  currentMedication: string | null;
  triedTreatment: boolean;
  treatmentTried: string | null;
  description: string;
}

/** Maximum lengths; they must match SubmitIntakeRequest in the back-end. */
export const MAX_LENGTH = {
  complaintAreaOther: 100,
  symptomsOther: 200,
  currentMedication: 500,
  treatmentTried: 500,
  description: 1000,
} as const;

/** Answer options in the order the form shows them, with the words the patient sees. */
export const COMPLAINT_AREAS: readonly { value: ComplaintArea; label: string }[] = [
  { value: 'HEAD_NECK', label: 'Head & neck' },
  { value: 'CHEST_BREATHING', label: 'Chest & breathing' },
  { value: 'STOMACH_DIGESTION', label: 'Stomach & digestion' },
  { value: 'BACK_JOINTS', label: 'Back & joints' },
  { value: 'ARMS_LEGS', label: 'Arms & legs' },
  { value: 'SKIN', label: 'Skin' },
  { value: 'MENTAL_HEALTH', label: 'Mental health' },
  { value: 'OTHER', label: 'Other' },
];

export const DURATIONS: readonly { value: ComplaintDuration; label: string }[] = [
  { value: 'LESS_THAN_A_DAY', label: 'Less than a day' },
  { value: 'ONE_TO_THREE_DAYS', label: '1–3 days' },
  { value: 'FOUR_TO_SEVEN_DAYS', label: '4–7 days' },
  { value: 'ONE_TO_FOUR_WEEKS', label: '1–4 weeks' },
  { value: 'MORE_THAN_A_MONTH', label: 'More than a month' },
];

export const SYMPTOMS: readonly { value: Symptom; label: string }[] = [
  { value: 'FEVER', label: 'Fever' },
  { value: 'PAIN', label: 'Pain' },
  { value: 'SWELLING', label: 'Swelling' },
  { value: 'RASH_ITCHING', label: 'Rash or itching' },
  { value: 'COUGH', label: 'Cough' },
  { value: 'TIREDNESS', label: 'Tiredness' },
  { value: 'NAUSEA_VOMITING', label: 'Nausea or vomiting' },
  { value: 'DIZZINESS', label: 'Dizziness' },
  { value: 'TROUBLE_SLEEPING', label: 'Trouble sleeping' },
];

const label = <T extends string>(options: readonly { value: T; label: string }[], value: T): string =>
  options.find((option) => option.value === value)?.label ?? value;

/** "Other: Ears" for an area the patient described, otherwise the option's label. */
export function areaLabel(intake: Pick<Intake, 'complaintArea' | 'complaintAreaOther'>): string {
  return intake.complaintArea === 'OTHER' && intake.complaintAreaOther
    ? `Other: ${intake.complaintAreaOther}`
    : label(COMPLAINT_AREAS, intake.complaintArea);
}

export function durationLabel(duration: ComplaintDuration): string {
  return label(DURATIONS, duration);
}

/** The ticked symptoms in checklist order, plus the patient's own words; empty when there are none. */
export function symptomLabels(intake: Pick<Intake, 'symptoms' | 'symptomsOther'>): string[] {
  const ticked = SYMPTOMS.filter((option) => intake.symptoms.includes(option.value)).map((option) => option.label);
  return intake.symptomsOther ? [...ticked, intake.symptomsOther] : ticked;
}
