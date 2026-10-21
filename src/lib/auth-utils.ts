import type { User } from "./types";

type RoleLike = Pick<User, "role" | "roles"> | null | undefined;

export function isAdmin(user: RoleLike) {
  return !!user && (user.role === "admin" || user.roles?.includes("admin"));
}

export function isInstructor(user: RoleLike) {
  return !!user && (user.role === "instructor" || user.roles?.includes("instructor"));
}

export function isAcademicManager(user: RoleLike) {
  return !!user && (user.role === "academic_manager" || !!user.roles?.includes("academic_manager"));
}

/** Academic advisors (cố vấn học tập) and academic managers manage classes. */
export function isAdvisor(user: RoleLike) {
  return !!user && (user.role === "advisor" || !!user.roles?.includes("advisor") || user.role === "academic_manager" || !!user.roles?.includes("academic_manager"));
}

/** Instructors, admins and advisors may use the studio (/studio); advisors only see the class module. */
export function canUseStudio(user: RoleLike) {
  return isAdmin(user) || isInstructor(user) || isAdvisor(user);
}

/** Teaching tools (courses, exams, grading...) are for instructors and admins. */
export function canTeach(user: RoleLike) {
  return isAdmin(user) || isInstructor(user);
}

/** Where a user lands after login / when visiting an auth page while signed in. */
export function homeFor(user: Pick<User, "role" | "roles">) {
  if (isAdmin(user)) return "/admin";
  if (isInstructor(user)) return "/studio";
  if (isAcademicManager(user)) return "/admin/academic/classes";
  if (isAdvisor(user)) return "/studio/classes";
  return "/my";
}

/** Only same-origin absolute paths are allowed as a post-login target. */
export function safeNext(next: string | string[] | null | undefined): string | null {
  const v = Array.isArray(next) ? next[0] : next;
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return null;
  if (v.startsWith("/session") || v.startsWith("/bff")) return null;
  return v;
}
