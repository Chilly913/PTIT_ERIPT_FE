export type GradingStatus = "pending" | "graded";

export interface GradingRow {
  id: number;
  grading_status: GradingStatus;
  score: number;
  passed: boolean;
  submitted_at: string | null;
  graded_at: string | null;
  kind: "exam" | "quiz";
  title: string;
  course_title: string | null;
  student: { id: number; name: string; email: string; student_code: string | null };
}

export interface GradingFile { id: number; name: string; size: number }

export interface GradingQuestion {
  id: number;
  type: string;
  content: string;
  points: number;
  parent_id?: number;
  answer?: unknown;
  score?: number;
  is_correct?: boolean | null;
  partial?: boolean;
  /** This question is scored by a person (essay, file upload). */
  manual?: boolean;
  needs_manual?: boolean;
  grade?: { score: number; comment?: string };
  files?: GradingFile[];
}

export interface GradingDetail {
  id: number;
  title: string;
  course_title: string | null;
  kind: "exam" | "quiz";
  grading_status: "none" | GradingStatus;
  status: string;
  pass_score: number;
  score: number;
  points_earned: number;
  points_max: number;
  passed: boolean;
  pending: boolean;
  submitted_at: string | null;
  graded_at: string | null;
  overall_feedback: string;
  student: { id: number; name: string; email: string; student_code: string | null };
  questions: GradingQuestion[];
}
