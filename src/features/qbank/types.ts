import type { PageMeta } from "@/lib/types";

export type QType =
  | "single_choice"
  | "multiple_choice"
  | "true_false"
  | "essay"
  | "matching"
  | "ordering"
  | "short_answer"
  | "numerical"
  | "cloze"
  | "classification"
  | "passage"
  | "file_upload";

export interface Bank {
  id: number;
  course_id: number;
  name: string;
  description: string | null;
  question_count: number;
  group_count: number;
  difficulty_distribution: Record<string, number>;
  created_at: string;
}
export interface Group {
  id: number;
  question_bank_id: number;
  name: string;
  description: string | null;
  position: number;
  question_count: number;
}
export interface Answer {
  id?: number;
  content: string;
  sub_content: string | null;
  is_correct: boolean;
  correct_position: number | null;
}
export interface QMetadata {
  tolerance?: number;
  /** cloze / classification: pay per correct part (default true). */
  partial_credit?: boolean;
  /** cloze: compare case-sensitively (default false). */
  case_sensitive?: boolean;
  /** cloze with wrong options: dropdown or drag the words (default select). */
  input?: "select" | "drag";
  /** file_upload limits. */
  max_files?: number;
  max_size_mb?: number;
  allowed_ext?: string[];
}
export interface Question {
  id: number;
  code: string;
  question_bank_id: number;
  question_group_id: number | null;
  /** Group name (the group a question sits in). */
  group?: string | null;
  type: QType;
  content: string;
  difficulty: number;
  default_score: number;
  explanation: string | null;
  feedback: string | null;
  metadata: QMetadata | null;
  /** Set on the sub-questions of a passage. */
  parent_question_id?: number | null;
  /** Sub-questions, only on a passage. */
  children?: Question[];
  answers: Answer[];
  used_in_quizzes: number;
}
export interface BankDetail extends Bank {
  groups: Group[];
  questions: { data: Question[]; meta: PageMeta };
}

/** A passage scores through its sub-questions. */
export const questionPoints = (q: Question): number => (q.type === "passage" ? (q.children ?? []).reduce((sum, c) => sum + c.default_score, 0) : q.default_score);

/** Blank ids ("1", "2") of a cloze text, in order of first appearance; same rule as the API. */
export function blankIds(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\{\{\s*(\d{1,2})\s*\}\}/g)) {
    const id = String(Number(m[1]));
    if (!out.includes(id)) out.push(id);
  }
  return out;
}
