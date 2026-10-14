import { ComplaintArea, ComplaintDuration } from './intake.model';

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
