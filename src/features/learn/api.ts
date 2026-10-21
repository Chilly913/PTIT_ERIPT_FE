import { api } from "@/lib/api";
import type { CourseDetail, CourseProgress, LessonDetail, LessonOutline, LessonProgress, SectionOutline } from "@/features/site/types";

export const keys = {
  course: (c: string) => ["learn", "course", c] as const,
  progress: (c: string) => ["learn", "progress", c] as const,
  lesson: (c: string, l: number) => ["learn", "lesson", c, l] as const,
  lessonProgress: (c: string, l: number) => ["learn", "lp", c, l] as const,
  notes: (c: string, l: number) => ["learn", "notes", c, l] as const,
  qa: (c: string, scope: string) => ["learn", "qa", c, scope] as const,
};

export const courseQuery = (c: string) => ({
  queryKey: keys.course(c),
  queryFn: () => api.get<CourseDetail>(`/courses/${c}`),
  staleTime: 5 * 60_000,
});
export const progressQuery = (c: string) => ({
  queryKey: keys.progress(c),
  queryFn: () => api.get<CourseProgress>(`/courses/${c}/progress`),
  staleTime: 60_000,
});
export const lessonQuery = (c: string, l: number) => ({
  queryKey: keys.lesson(c, l),
  queryFn: () => api.get<LessonDetail>(`/courses/${c}/lessons/${l}`),
  staleTime: 5 * 60_000,
});
export const lessonProgressQuery = (c: string, l: number) => ({
  queryKey: keys.lessonProgress(c, l),
  queryFn: () => api.get<LessonProgress>(`/courses/${c}/lessons/${l}/progress`),
  staleTime: 60_000,
  retry: false,
});

export interface FlatLesson extends LessonOutline {
  sectionTitle: string;
}

/** Curriculum in display order: sections by position, lessons by order, loose lessons last. */
export function flattenCurriculum(course: CourseDetail): { groups: { id: number; title: string; lessons: FlatLesson[] }[]; flat: FlatLesson[] } {
  const groups: { id: number; title: string; lessons: FlatLesson[] }[] = [];
  const seen = new Set<number>();
  const push = (s: Pick<SectionOutline, "id" | "title">, lessons: LessonOutline[]) => {
    const ls = [...lessons].sort((a, b) => a.order - b.order || a.id - b.id).map((l) => ({ ...l, sectionTitle: s.title }));
    if (!ls.length) return;
    ls.forEach((l) => seen.add(l.id));
    groups.push({ id: s.id, title: s.title, lessons: ls });
  };
  [...(course.sections ?? [])].sort((a, b) => a.position - b.position || a.id - b.id).forEach((s) => push(s, s.lessons));
  const loose = (course.lessons ?? []).filter((l) => !seen.has(l.id));
  if (loose.length) push({ id: -1, title: "Nội dung khác" }, loose);
  return { groups, flat: groups.flatMap((g) => g.lessons) };
}

export function completedSet(p: CourseProgress | undefined): Set<number> {
  return new Set((p?.lessons ?? []).filter((l) => l.completed).map((l) => l.id));
}

/** Lessons the learner cannot open yet (course/section schedule or sequential order) with the reason. */
export function lockedMap(p: CourseProgress | undefined): Map<number, string> {
  return new Map((p?.lessons ?? []).filter((l) => l.locked).map((l) => [l.id, l.locked_reason ?? ""]));
}

export function firstUnfinished(flat: FlatLesson[], done: Set<number>): FlatLesson | undefined {
  return flat.find((l) => !done.has(l.id)) ?? flat[0];
}

/** Recompute the aggregate fields after flipping one lesson. */
export function withLessonCompleted(p: CourseProgress, lessonId: number, completed: boolean): CourseProgress {
  const lessons = p.lessons.map((l) => (l.id === lessonId ? { ...l, completed } : l));
  const done = lessons.filter((l) => l.completed).length;
  const total = p.total_lessons || lessons.length;
  return { ...p, lessons, completed_lessons: done, percent: total ? Math.round((done / total) * 1000) / 10 : 0 };
}
