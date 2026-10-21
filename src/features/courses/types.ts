import type { PageMeta } from "@/lib/types";

export type CourseStatus = "draft" | "pending_review" | "published" | "closed" | "rejected";
export type CourseLevel = "beginner" | "intermediate" | "advanced";

export interface UserBrief {
  id: number;
  name: string;
  avatar?: string | null;
  email?: string;
}

export interface CategoryBrief {
  id: number;
  name: string;
  slug: string;
}

export interface Course {
  id: number;
  user_id: number;
  category_id: number | null;
  title: string;
  slug: string;
  description: string | null;
  learning_outcomes: string[] | null;
  benefits: string[] | null;
  requirements: string[] | null;
  level: CourseLevel | null;
  trailer_url: string | null;
  price: number;
  status: CourseStatus;
  is_featured: boolean;
  reject_reason: string | null;
  thumbnail: string | null;
  /** Learners cannot open the course before opens_at / after closes_at. */
  opens_at?: string | null;
  closes_at?: string | null;
  /** free: any lesson, sequential: lessons unlock in order. */
  learning_mode?: "free" | "sequential";
  certificate_template_id?: number | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  lessons_count?: number;
  enrollments_count?: number;
  reviews_count?: number;
  reviews_avg_rating?: number | null;
  avg_rating?: number | null;
  instructor?: UserBrief | null;
  category?: CategoryBrief | null;
}

export interface CourseListResponse {
  data: Course[];
  meta: PageMeta;
}

export interface CategoryNode {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  courses_count?: number;
  children?: CategoryNode[];
}

export type LessonType =
  | "video" | "audio" | "file" | "page" | "quiz" | "assignment" | "forum" | "survey"
  | "zoom" | "meet" | "document" | "virtual_class" | "scorm" | "h5p" | "live" | "offline";

export interface Attachment {
  id: number;
  lesson_id: number;
  original_name: string;
  file_path: string;
  file_size: string | null;
  mime_type: string | null;
  url?: string | null;
}

export interface VirtualClass {
  id: number;
  lesson_id: number;
  provider: string;
  meeting_id: string | null;
  meeting_password: string | null;
  join_url: string;
  start_url: string | null;
  start_at: string | null;
  duration: number;
}

export interface Assignment {
  id: number;
  lesson_id: number;
  instructions: string;
  /** KB */
  max_file_size: number;
  allowed_extensions: string;
  available_from: string | null;
  submission_open_at: string | null;
  due_at: string | null;
}

export interface Lesson {
  id: number;
  course_id: number;
  section_id: number | null;
  title: string;
  type: LessonType | (string & {});
  description: string | null;
  video_url: string | null;
  /** Seconds. */
  duration: number;
  order: number;
  is_preview: boolean;
  video_status?: string;
  video_size?: string | null;
  attachments?: Attachment[];
  virtual_class?: VirtualClass | null;
  scorm_package?: { id: number; title: string | null; version?: string; uuid?: string; entry_url?: string | null } | null;
  assignment?: Assignment | null;
}

export interface Section {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  position: number;
  opens_at?: string | null;
  closes_at?: string | null;
  lessons: Lesson[];
}

export interface SectionsResponse {
  data: Section[];
}

export interface Student {
  enrollment_id: number;
  user: { id: number; name: string; email: string; avatar?: string | null; student_code?: string | null };
  source: string;
  enrolled_at: string | null;
  progress_percent: number;
  progress_state: "not_started" | "in_progress" | "completed";
  completed_lessons: number;
  total_lessons: number;
  last_activity_at: string | null;
}

export interface AddStudentsResult {
  enrolled: number;
  already: number;
  not_found: string[];
}

export interface Review {
  id: number;
  user_id: number;
  rating: number;
  comment: string | null;
  created_at: string | null;
  user: UserBrief | null;
}

export interface QaReply {
  id: number;
  user_id: number;
  content: string;
  created_at: string | null;
  user: UserBrief | null;
}

export interface Qa {
  id: number;
  user_id: number;
  lesson_id: number | null;
  subject: string;
  content: string;
  created_at: string | null;
  user: UserBrief | null;
  replies: QaReply[];
}

export interface Submission {
  id: number;
  lesson_assignment_id: number;
  user_id: number;
  file_url: string;
  student_note: string | null;
  grade: string | null;
  feedback: string | null;
  submitted_at: string | null;
  user: { id: number; name: string; email: string } | null;
}

export interface AssignmentInbox {
  lesson_id: number;
  lesson_title: string;
  assignment_id: number;
  due_at: string | null;
  submissions_count: number;
  ungraded_count: number;
  submissions: Submission[];
}

export interface SubmissionsResponse {
  course: { id: number; title: string };
  assignments: AssignmentInbox[];
  summary: { assignments: number; submissions: number; ungraded: number };
}
