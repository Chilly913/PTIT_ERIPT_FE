import type { PageMeta } from "@/lib/types";

export type ExamStatus = "draft" | "scheduled" | "active" | "closed" | "archived";

export interface Exam {
  id: number;
  title: string;
  description: string | null;
  type: "course_final" | "standalone";
  course_id: number | null;
  course_title: string | null;
  status: ExamStatus;
  duration: number | null;
  pass_score: number;
  max_attempts: number;
  variant_count: number;
  shuffle_questions: boolean;
  shuffle_answers: boolean;
  proctoring_enabled: boolean;
  starts_at: string | null;
  ends_at: string | null;
  room: string | null;
  question_count: number;
  attempts_count: number;
  candidates_count: number;
  review_options?: { show_score: boolean; show_answers: boolean; show_correct_answers: boolean; show_explanation: boolean; when: string };
  proctoring?: { enabled: boolean; require_face: boolean; require_fullscreen: boolean; block_copy_paste: boolean; max_violations: number; auto_submit: boolean };
}

export interface QuizQuestion {
  question_id: number;
  position: number;
  code: string;
  type: string;
  difficulty: number;
  content: string;
  default_score: number;
  points: number | null;
  effective_points: number;
}
export interface RandomRule {
  bank_id: number;
  group_id?: number | null;
  difficulty?: number | null;
  count: number;
  points?: number | null;
  bank_name?: string;
  group_name?: string | null;
  available?: number;
}
export interface QuizView {
  id: number;
  time_limit: number | null;
  pass_score: number;
  questions: QuizQuestion[];
  random_rules: RandomRule[];
  summary: { fixed_count: number; random_count: number; total_questions: number; total_points: number; warnings: string[] };
}
export interface ExamDetail extends Exam {
  quiz: QuizView;
}

export interface Candidate {
  user_id: number;
  name: string;
  email: string;
  student_code: string | null;
  source: "exam" | "course";
  enrolled_at: string | null;
  attempts_used: number;
}

export interface ResultRow {
  user: { id: number; name: string; email: string; student_code: string | null };
  attempts_used: number;
  best_score: number | null;
  last_score: number | null;
  status: string;
  passed: boolean;
  duration_seconds: number | null;
  violations_count: number;
  last_submitted_at: string | null;
}
export interface ResultsResponse {
  data: ResultRow[];
  meta: PageMeta;
  summary: {
    candidates: number;
    attempted: number;
    not_attempted: number;
    average_score: number | null;
    highest_score: number | null;
    lowest_score: number | null;
    pass_count: number;
    pass_rate: number | null;
    distribution: Array<{ from: number; to: number; count: number }>;
  };
}
