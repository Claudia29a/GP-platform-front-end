import { ComplaintArea, ComplaintDuration, Symptom } from './intake.model';

/** One question in the practice's queue, as returned by GET /queue (staff only). */
export interface QueueItem {
  id: string;
  position: number;
  /** 0–100, calculated from the answers. A sorting suggestion for the practice, never a diagnosis. */
  severityScore: number;
  patientName: string;
  complaintArea: ComplaintArea;
  complaintAreaOther: string | null;
  duration: ComplaintDuration;
  severity: number;
  /** The ticked symptoms, in the order the form lists them. */
  symptoms: Symptom[];
  description: string;
  submittedAt: string;
}

export type ScoreLevel = 'high' | 'medium' | 'low';

/** Groups scores for colouring only: 60 and up high, 30 and up medium, the rest low. */
export function scoreLevel(score: number): ScoreLevel {
  if (score >= 60) {
    return 'high';
  }
  return score >= 30 ? 'medium' : 'low';
}

const URGENCY_LABELS: Record<ScoreLevel, string> = { high: 'High', medium: 'Medium', low: 'Low' };

/** User story 8: the urgency word shown next to the score; the same groups as the colours. */
export function urgencyLabel(score: number): string {
  return URGENCY_LABELS[scoreLevel(score)];
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** User story 8: "3 h", in the largest whole unit; a clock that runs a little ahead never gives a negative time. */
export function waitingTime(submittedAt: string, now: Date): string {
  const waited = Math.max(0, now.getTime() - new Date(submittedAt).getTime());
  if (waited >= DAY) {
    const days = Math.floor(waited / DAY);
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  }
  if (waited >= HOUR) {
    return `${Math.floor(waited / HOUR)} h`;
  }
  return waited >= MINUTE ? `${Math.floor(waited / MINUTE)} min` : 'under a minute';
}

/** User story 8: "Waiting 3 h", as the queue shows it. */
export function waitingLabel(submittedAt: string, now: Date): string {
  return `Waiting ${waitingTime(submittedAt, now)}`;
}

/** User story 8: the queue shows only the first line of the patient's question. */
export function firstLine(text: string): string {
  return text.trim().split('\n')[0].trim();
}
