export interface DayCount { date: string; count: number }
export interface RecentUser {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  roles: string[];
  primary_role?: string | null;
  email_verified: boolean;
  disabled: boolean;
  created_at: string;
}
export interface PendingCourse { id: number; title: string; instructor_name: string | null; created_at: string }
export interface AdminStats {
  generated_at: string;
  users: {
    total: number; active: number; disabled: number; unverified: number; new_7d: number; new_30d: number;
    by_role: Array<{ role: string; count: number }>;
  };
  courses: { total: number; by_status: Array<{ status: string; count: number }> };
  enrollments: { total: number; new_7d: number; new_30d: number };
  learning: { lessons_completed_30d: number };
  exams: { total: number; active: number; attempts_30d: number };
  series: { signups_30d: DayCount[]; enrollments_30d: DayCount[] };
  recent_users: RecentUser[];
  pending_courses: PendingCourse[];
}
