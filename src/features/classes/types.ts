export interface ClassSummary {
  id: number;
  code: string;
  name: string;
  status: string;
  capacity: number;
  expected_graduation_year: number | null;
  description: string | null;
  student_count: number;
  cohort: { id: number; code: string; name: string; start_year: number } | null;
  program: { id: number; code: string; name: string };
  advisor: { id: number; name: string; email: string } | null;
  curriculum: { id: number; code: string; name: string } | null;
}

export interface ClassStudent {
  id: number;
  name: string;
  email: string;
  student_code: string | null;
  courses: number;
  progress: number;
}

export interface ClassCourse {
  course_id: number;
  slug: string;
  title: string;
  status: string;
  term_number: number | null;
  is_required: boolean;
  credits: number | null;
  term: { id: number; name: string; start_date: string; end_date: string; year: string } | null;
  enrolled: number;
  completed: number;
}

export interface ClassDetail {
  class: ClassSummary;
  students: ClassStudent[];
  courses: ClassCourse[];
  term_map: { term_number: number; term_id: number; name: string; year: string }[];
}

export interface TermOption {
  id: number;
  name: string;
  code: string;
  year: string;
  year_id: number;
  is_current: boolean;
}
