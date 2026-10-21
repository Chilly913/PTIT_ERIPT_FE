"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { isApiError } from "@/lib/errors";
import { qk } from "../api";
import { courseMessages as m } from "../messages";
import type { Lesson, Section } from "../types";

let tempSeq = 0;
const tempId = () => -(++tempSeq);
export const isTemp = (id: number) => id < 0;

const errMsg = (e: unknown) => (isApiError(e) ? e.message : m.common.loadError);

/** Moves a lesson one slot up/down across the whole tree (crossing section borders at the edges). */
export function moveLessonBy(sections: Section[], lessonId: number, dir: -1 | 1): Section[] | null {
  const si = sections.findIndex((s) => s.lessons.some((l) => l.id === lessonId));
  if (si < 0) return null;
  const next = sections.map((s) => ({ ...s, lessons: [...s.lessons] }));
  const li = next[si].lessons.findIndex((l) => l.id === lessonId);
  const [lesson] = next[si].lessons.splice(li, 1);
  const target = li + dir;
  if (target >= 0 && target <= next[si].lessons.length) {
    next[si].lessons.splice(target, 0, lesson);
    return next;
  }
  const ni = si + dir;
  if (ni < 0 || ni >= next.length) return null;
  const moved = { ...lesson, section_id: next[ni].id };
  if (dir === -1) next[ni].lessons.push(moved);
  else next[ni].lessons.unshift(moved);
  return next;
}

export function moveSectionBy(sections: Section[], sectionId: number, dir: -1 | 1): Section[] | null {
  const i = sections.findIndex((s) => s.id === sectionId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= sections.length) return null;
  const next = [...sections];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/**
 * All curriculum mutations. Every action updates the React Query cache first (instant UI) and
 * rolls back to the previous tree when the API refuses. Persisting reorders is serialised so
 * quick successive drags cannot overtake each other.
 */
export function useCurriculumOps(courseId: number) {
  const qc = useQueryClient();
  const toast = useToast();
  const key = qk.sections(courseId);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const read = useCallback(() => qc.getQueryData<Section[]>(key) ?? [], [qc, key]);
  const write = useCallback((fn: (s: Section[]) => Section[]) => qc.setQueryData<Section[]>(key, (s) => (s ? fn(s) : s)), [qc, key]);
  const refreshCounts = useCallback(() => {
    void qc.invalidateQueries({ queryKey: qk.myCoursesAll });
    void qc.invalidateQueries({ queryKey: qk.course(courseId) });
  }, [qc, courseId]);

  /** Runs `fn` after previous queued writes; on failure restores `snapshot`. */
  const enqueue = useCallback(
    (snapshot: Section[], fn: () => Promise<void>, failMsg?: string) => {
      queue.current = queue.current
        .then(fn)
        .catch((e) => {
          qc.setQueryData(key, snapshot);
          toast.error(failMsg ?? errMsg(e), failMsg ? errMsg(e) : undefined);
          void qc.invalidateQueries({ queryKey: key });
        });
      return queue.current;
    },
    [qc, key, toast],
  );

  const persistTree = useCallback(
    (prev: Section[], next: Section[]) => {
      write(() => next);
      return enqueue(
        prev,
        async () => {
          const ids = (s: Section[]) => s.map((x) => x.id).join(",");
          if (ids(prev) !== ids(next)) {
            await api.post(`/courses/${courseId}/sections/reorder`, { sections: next.map((s, i) => ({ id: s.id, position: i + 1 })) });
          }
          const before = new Map<number, number | null>();
          prev.forEach((s) => s.lessons.forEach((l) => before.set(l.id, s.id)));
          const moved: Array<{ id: number; section: number }> = [];
          next.forEach((s) => s.lessons.forEach((l) => before.get(l.id) !== s.id && moved.push({ id: l.id, section: s.id })));
          await Promise.all(moved.map((x) => api.put(`/courses/${courseId}/lessons/${x.id}`, { section_id: x.section })));
          const flat = (s: Section[]) => s.flatMap((x) => x.lessons.map((l) => l.id));
          if (flat(prev).join(",") !== flat(next).join(",") || moved.length) {
            await api.post(`/courses/${courseId}/lessons/reorder`, { order: flat(next) });
          }
        },
        m.curriculum.reorderFailed,
      );
    },
    [write, enqueue, courseId],
  );

  const addSection = useCallback(
    async (title = m.curriculum.newSectionTitle) => {
      const prev = read();
      const tid = tempId();
      write((s) => [...s, { id: tid, course_id: courseId, title, description: null, position: s.length + 1, lessons: [] }]);
      try {
        const res = await api.post<{ data: Section }>(`/courses/${courseId}/sections`, { title });
        write((s) => s.map((x) => (x.id === tid ? { ...x, ...res.data, lessons: x.lessons } : x)));
        return res.data.id;
      } catch (e) {
        qc.setQueryData(key, prev);
        toast.error(errMsg(e));
        return null;
      }
    },
    [read, write, courseId, qc, key, toast],
  );

  const renameSection = useCallback(
    (id: number, title: string) => {
      const prev = read();
      write((s) => s.map((x) => (x.id === id ? { ...x, title } : x)));
      void enqueue(prev, async () => void (await api.put(`/sections/${id}`, { title })));
    },
    [read, write, enqueue],
  );

  const scheduleSection = useCallback(
    (id: number, v: { opens_at: string | null; closes_at: string | null }) => {
      write((s) => s.map((x) => (x.id === id ? { ...x, ...v } : x)));
    },
    [write],
  );

  const deleteSection = useCallback(
    (id: number) => {
      const prev = read();
      write((s) => s.filter((x) => x.id !== id));
      void enqueue(prev, async () => {
        await api.delete(`/sections/${id}`);
        refreshCounts();
      });
    },
    [read, write, enqueue, refreshCounts],
  );

  const addLesson = useCallback(
    async (sectionId: number, title = m.curriculum.newLessonTitle) => {
      const prev = read();
      const tid = tempId();
      const temp: Lesson = { id: tid, course_id: courseId, section_id: sectionId, title, type: "video", description: null, video_url: null, duration: 0, order: 0, is_preview: false };
      write((s) => s.map((x) => (x.id === sectionId ? { ...x, lessons: [...x.lessons, temp] } : x)));
      try {
        const res = await api.post<{ lesson: Lesson }>(`/courses/${courseId}/lessons`, { title, section_id: sectionId, type: "video" });
        write((s) => s.map((x) => ({ ...x, lessons: x.lessons.map((l) => (l.id === tid ? { ...l, ...res.lesson } : l)) })));
        refreshCounts();
        return res.lesson.id;
      } catch (e) {
        qc.setQueryData(key, prev);
        toast.error(errMsg(e));
        return null;
      }
    },
    [read, write, courseId, qc, key, toast, refreshCounts],
  );

  const patchLesson = useCallback((id: number, patch: Partial<Lesson>) => write((s) => s.map((x) => ({ ...x, lessons: x.lessons.map((l) => (l.id === id ? { ...l, ...patch } : l)) }))), [write]);

  const renameLesson = useCallback(
    (id: number, title: string) => {
      const prev = read();
      patchLesson(id, { title });
      void enqueue(prev, async () => void (await api.put(`/courses/${courseId}/lessons/${id}`, { title })));
    },
    [read, patchLesson, enqueue, courseId],
  );

  const deleteLesson = useCallback(
    (id: number) => {
      const prev = read();
      write((s) => s.map((x) => ({ ...x, lessons: x.lessons.filter((l) => l.id !== id) })));
      void enqueue(prev, async () => {
        await api.delete(`/courses/${courseId}/lessons/${id}`);
        refreshCounts();
      });
    },
    [read, write, enqueue, courseId, refreshCounts],
  );

  return { read, write, persistTree, addSection, renameSection, scheduleSection, deleteSection, addLesson, patchLesson, renameLesson, deleteLesson };
}
