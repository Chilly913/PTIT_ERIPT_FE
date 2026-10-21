/** Shapes of the legacy-style catalog / study / interaction endpoints (see PTIT_ERIPT_API docs/phase2). */

/** Laravel-style paginator used by catalog and interaction lists. */
export interface LegacyPage<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface UserBrief {
  id: number;
  name: string;
  avatar: string | null;
}

export interface CategoryBrief {
  id: number;
  name: string;
  slug: string;
}

export interface CategoryNode {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  courses_count: number;
  children?: CategoryNode[];
}

export interface CourseSummary {
  id: number;
  user_id: number;
  category_id: number | null;
  title: string;
  slug: string;
  description: string | null;
  level: string | null;
  price: number;
  status: string;
  is_featured: boolean;
  thumbnail: string | null;
  published_at: string | null;
  lessons_count: number;
  enrollments_count: number;
  reviews_count: number;
  reviews_avg_rating: number | null;
  instructor: UserBrief | null;
  category: CategoryBrief | null;
}

export interface LessonOutline {
  id: number;
  section_id: number | null;
  course_id: number;
  title: string;
  type: string;
  duration: number;
  is_preview: boolean;
  order: number;
}

export interface SectionOutline {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  position: number;
  lessons: LessonOutline[];
}

export interface Review {
  id: number;
  user_id: number;
  course_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  user: UserBrief | null;
}

export interface CourseDetail extends Omit<CourseSummary, "reviews_avg_rating"> {
  learning_outcomes: string[];
  benefits: string[];
  requirements: string[];
  trailer_url: string | null;
  course_mode: string;
  certificate_template_id: number | null;
  updated_at: string;
  enrollments_count: number;
  reviews_count: number;
  lessons_count: number;
  avg_rating: number;
  sections: SectionOutline[];
  lessons: (LessonOutline & { video_url?: string | null })[];
  is_enrolled: boolean;
  has_reviewed: boolean;
  latest_reviews: Review[];
}

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
  provider: string;
  meeting_id: string | null;
  meeting_password: string | null;
  join_url: string | null;
  start_url: string | null;
  start_at: string | null;
  duration: number;
}

export interface ScormPackage {
  id: number;
  uuid: string;
  version: string;
  entry_url: string | null;
  title: string | null;
}

export interface AssignmentInfo {
  id: number;
  lesson_id: number;
  instructions: string;
  max_file_size: number;
  allowed_extensions: string;
  available_from: string | null;
  submission_open_at: string | null;
  due_at: string | null;
}

export interface QuizInfo {
  id: number;
  title: string;
  description: string | null;
  time_limit: number | null;
  pass_score: number;
}

export interface OfflineSession {
  id: number;
  location: string;
  room: string | null;
  start_at: string | null;
  duration: number | null;
  title: string | null;
}

export interface LessonDetail {
  id: number;
  course_id: number;
  section_id: number | null;
  title: string;
  type: string;
  description: string | null;
  video_url: string | null;
  duration: number;
  order: number;
  is_preview: boolean;
  video_status: string;
  virtual_class: VirtualClass | null;
  scorm_package: ScormPackage | null;
  offline_session: OfflineSession | null;
  assignment: AssignmentInfo | null;
  attachments: Attachment[];
  quiz: QuizInfo | null;
}

export interface LessonProgress {
  lesson_id: number;
  progress_percent: number;
  last_position: number;
  completed: boolean;
  watched_seconds: number;
}

export interface CourseProgress {
  total_lessons: number;
  completed_lessons: number;
  percent: number;
  lessons: { id: number; title: string; order: number; duration: number; completed: boolean; watched_seconds: number; locked?: boolean; locked_reason?: string | null }[];
}

export interface EnrollmentItem {
  id: number;
  course_id: number;
  enrollment_source: string;
  enrolled_at: string;
  progress: number;
  lessons_count: number;
  completed_lessons: number;
  certificate_enabled?: boolean;
  certificate_credential?: string | null;
  window_status: string;
  is_planned: boolean;
  starts_at: string | null;
  ends_at: string | null;
  term: { display_name: string } | null;
  course: {
    id: number;
    title: string;
    thumbnail: string | null;
    price: number;
    status: string;
    category: { id: number; name: string } | null;
    instructor: UserBrief | null;
  } | null;
}

export interface Note {
  id: number;
  lesson_id: number;
  content: string;
  position_seconds: number;
  created_at: string;
  updated_at: string;
}

export type QaUser = UserBrief;

export interface QaReaction {
  like_count: number;
  dislike_count: number;
  my_reaction: "like" | "dislike" | null;
}

export interface QaReply extends QaReaction {
  id: number;
  course_qa_id: number;
  user_id: number;
  content: string;
  created_at: string;
  user: QaUser | null;
}

export interface Qa extends QaReaction {
  id: number;
  user_id: number;
  course_id: number;
  lesson_id: number | null;
  subject: string;
  content: string;
  created_at: string;
  user: QaUser | null;
  replies: QaReply[];
}

export interface SiteSettings {
  site_name: string;
  site_logo: string | null;
  footer_text: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  social_links: Record<string, string>;
}

export interface SubmissionInfo {
  id: number;
  file_url: string;
  student_note: string | null;
  grade: string | null;
  feedback: string | null;
  submitted_at: string | null;
}

export interface NewsItem {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  is_featured: boolean;
  published_at: string;
}

export interface NewsDetail extends NewsItem {
  content: string | null;
}

export interface Partner {
  id: number;
  name: string;
  logo: string;
  website_url: string | null;
}
