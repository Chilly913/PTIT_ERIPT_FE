export type UserType = "student" | "instructor" | "staff" | "academic_manager" | "admin";
export type UserStatusFilter = "" | "active" | "disabled" | "unverified";
export type BulkAction = "disable" | "enable" | "delete";

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  user_type: UserType;
  roles: string[];
  primary_role: string | null;
  student_code: string | null;
  staff_code: string | null;
  phone: string | null;
  email_verified: boolean;
  disabled: boolean;
  created_at: string;
  last_login_at: string | null;
  invite_sent?: boolean;
}

export interface AdminUserProfile {
  gender: "male" | "female" | "other" | null;
  date_of_birth: string | null;
  hometown: string | null;
  permanent_address: string | null;
  nationality: string | null;
  bio: string | null;
  id_card_number: string | null;
  institution_id: number | null;
  institution_name?: string | null;
  unit_id: number | null;
  unit_name?: string | null;
  program_id: number | null;
  major_id: number | null;
  specialization_id: number | null;
  cohort_id: number | null;
  administrative_class_id: number | null;
  advisor_id: number | null;
  study_status: string | null;
  email_verified_at: string | null;
  updated_at: string | null;
}

export interface AdminUserDetail extends AdminUser {
  profile: AdminUserProfile;
}

export interface RoleInfo {
  name: string;
  label: string;
  permissions: string[];
  users_count: number;
}

export interface PermissionInfo {
  name: string;
  label: string;
  description: string;
}

export interface UsersQuery {
  page: number;
  per_page: number;
  q: string;
  role: string;
  status: UserStatusFilter;
  sort: string;
}
