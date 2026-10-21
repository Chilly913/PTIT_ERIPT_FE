"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import type { CourseProgress, LessonProgress } from "@/features/site/types";
import { keys, withLessonCompleted } from "./api";
import { learnMessages as m } from "./messages";

/**
 * Marks a lesson complete / incomplete. Optimistic: the sidebar tick and progress bar flip at once,
 * and are rolled back when the server refuses.
 */
export function useSetCompleted(course: string, lessonId: number) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ completed, watched }: { completed: boolean; watched: number }) =>
      api.post(`/courses/${course}/lessons/${lessonId}/progress`, { watched_seconds: Math.max(0, Math.floor(watched)), completed }),
    onMutate: async ({ completed }) => {
      await Promise.all([qc.cancelQueries({ queryKey: keys.progress(course) }), qc.cancelQueries({ queryKey: keys.lessonProgress(course, lessonId) })]);
      const prev = qc.getQueryData<CourseProgress>(keys.progress(course));
      const prevLp = qc.getQueryData<LessonProgress>(keys.lessonProgress(course, lessonId));
      if (prev) qc.setQueryData(keys.progress(course), withLessonCompleted(prev, lessonId, completed));
      if (prevLp) qc.setQueryData(keys.lessonProgress(course, lessonId), { ...prevLp, completed });
      return { prev, prevLp };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.progress(course), ctx.prev);
      if (ctx?.prevLp) qc.setQueryData(keys.lessonProgress(course, lessonId), ctx.prevLp);
      toast.error(m.progressSaveError);
    },
    onSuccess: (_d, v) => {
      if (v.completed) toast.success(m.completedToast);
      void qc.invalidateQueries({ queryKey: ["site", "enrollments"] });
      void qc.invalidateQueries({ queryKey: ["site", "dashboard"] });
    },
  });
}
