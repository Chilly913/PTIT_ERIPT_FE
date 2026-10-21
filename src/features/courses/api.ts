"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { isApiError } from "@/lib/errors";
import type { Paginated } from "@/lib/types";
import type {
  CategoryNode,
  Course,
  CourseListResponse,
  Qa,
  Review,
  Section,
  SectionsResponse,
  Student,
  SubmissionsResponse,
} from "./types";

/** React Query keys. Everything lives under "studio" so a single invalidate refreshes the area. */
export const qk = {
  categories: ["studio", "categories"] as const,
  myCourses: (p?: object) => ["studio", "my-courses", p ?? {}] as const,
  myCoursesAll: ["studio", "my-courses"] as const,
  course: (id: string | number) => ["studio", "course", String(id)] as const,
  sections: (id: string | number) => ["studio", "sections", String(id)] as const,
  students: (id: string | number, p?: object) => ["studio", "students", String(id), p ?? {}] as const,
  reviews: (id: string | number, page: number) => ["studio", "reviews", String(id), page] as const,
  qas: (id: string | number, page: number) => ["studio", "qas", String(id), page] as const,
  submissions: (id: string | number) => ["studio", "submissions", String(id)] as const,
  dashboard: ["studio", "dashboard"] as const,
  adminCourses: (p?: object) => ["studio", "admin-courses", p ?? {}] as const,
};

/** 404/405 from a feature endpoint means the route does not exist on this server build yet. */
export function isNotReady(error: unknown) {
  return isApiError(error) && (error.status === 404 || error.status === 405 || error.status === 501);
}

export interface FlatCategory {
  id: number;
  name: string;
  depth: number;
  label: string;
}

function flatten(nodes: CategoryNode[], depth = 0, out: FlatCategory[] = []) {
  for (const n of nodes) {
    out.push({ id: n.id, name: n.name, depth, label: `${" ".repeat(depth)}${n.name}` });
    if (n.children?.length) flatten(n.children, depth + 1, out);
  }
  return out;
}

/** Category tree flattened in display order (parents before children). */
export function useCategories() {
  return useQuery({
    queryKey: qk.categories,
    queryFn: async () => {
      const raw = await api.get<CategoryNode[] | { data: CategoryNode[] }>("/categories");
      const list = Array.isArray(raw) ? raw : raw.data;
      // Tree answers (children nested) and flat answers (parent_id) are both handled.
      const hasNested = list.some((c) => c.children?.length);
      if (hasNested) return flatten(list.filter((c) => !c.parent_id));
      const byParent = new Map<number | null, CategoryNode[]>();
      for (const c of list) byParent.set(c.parent_id ?? null, [...(byParent.get(c.parent_id ?? null) ?? []), c]);
      const build = (pid: number | null): CategoryNode[] => (byParent.get(pid) ?? []).map((c) => ({ ...c, children: build(c.id) }));
      return flatten(build(null));
    },
    staleTime: 10 * 60_000,
  });
}

export interface MyCoursesParams {
  page?: number;
  per_page?: number;
  status?: string;
  search?: string;
  sort?: string;
}

export function useMyCourses(params: MyCoursesParams) {
  return useQuery({
    queryKey: qk.myCourses(params),
    queryFn: () => api.get<CourseListResponse>("/my-courses", { query: { ...params } }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useCourse(id: string | number | null) {
  return useQuery({
    queryKey: qk.course(id ?? "none"),
    queryFn: () => api.get<Course>(`/courses/${id}`),
    enabled: id != null,
    staleTime: 30_000,
  });
}

export function useSections(courseId: string | number | null) {
  return useQuery({
    queryKey: qk.sections(courseId ?? "none"),
    queryFn: async () => (await api.get<SectionsResponse>(`/courses/${courseId}/sections`)).data,
    enabled: courseId != null,
    staleTime: 60_000,
  });
}

export function useStudents(courseId: string | number, params: object) {
  return useQuery({
    queryKey: qk.students(courseId, params),
    queryFn: () => api.get<Paginated<Student>>(`/courses/${courseId}/students`, { query: params as Record<string, string | number> }),
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useReviews(courseId: string | number, page: number) {
  return useQuery({
    queryKey: qk.reviews(courseId, page),
    queryFn: () => api.get<Paginated<Review>>(`/courses/${courseId}/reviews`, { query: { page } }),
    placeholderData: keepPreviousData,
  });
}

export function useQas(courseId: string | number, page: number) {
  return useQuery({
    queryKey: qk.qas(courseId, page),
    queryFn: () => api.get<Paginated<Qa>>(`/courses/${courseId}/qas`, { query: { page } }),
    placeholderData: keepPreviousData,
  });
}

export function useSubmissions(courseId: string | number) {
  return useQuery({
    queryKey: qk.submissions(courseId),
    queryFn: () => api.get<SubmissionsResponse>(`/courses/${courseId}/assignments/submissions`),
    staleTime: 15_000,
  });
}

/** Writes a patched course into every cache that holds it (instant UI, server confirms later). */
export function useCoursePatcher() {
  const qc = useQueryClient();
  return (id: number, patch: Partial<Course>) => {
    qc.setQueryData<Course>(qk.course(id), (c) => (c ? { ...c, ...patch } : c));
    qc.setQueriesData<CourseListResponse>({ queryKey: qk.myCoursesAll }, (l) =>
      l ? { ...l, data: l.data.map((c) => (c.id === id ? { ...c, ...patch } : c)) } : l,
    );
  };
}

export type { Section };
