export type RoleName =
  | "admin"
  | "instructor"
  | "student"
  | "staff"
  | "academic_manager"
  | (string & {});

/** Authenticated user as returned by `GET /api/auth/me` / login. */
export interface User {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  /** Primary role. */
  role: RoleName | null;
  roles: RoleName[];
  permissions: string[];
  email_verified: boolean;
  user_type?: string;
  student_code?: string | null;
  staff_code?: string | null;
  phone?: string | null;
  [key: string]: unknown;
}

export interface PageMeta {
  page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

/** Body shape of every Go error response. */
export interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
  requires_verification?: boolean;
  email?: string;
}