"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/cn";
import { Button, buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowLeftIcon, BookIcon, ListIcon } from "@/components/icons";
import { QueryError } from "@/components/site/query-state";
import type { CourseDetail, CourseProgress } from "@/features/site/types";
import { completedSet, courseQuery, flattenCurriculum, lockedMap, lessonProgressQuery, lessonQuery, progressQuery, type FlatLesson } from "./api";
import { CurriculumSidebar } from "./curriculum-sidebar";
import { LessonView } from "./lesson-view";
import { learnMessages as m } from "./messages";
import { QuizRunner } from "./quiz-runner";
import { useLearnRoute } from "./use-learn-route";

export function LearnShell({
  course,
  userId,
  initialCourse,
  initialProgress,
}: {
  course: string;
  userId: number;
  initialCourse: CourseDetail | null;
  initialProgress: CourseProgress | null;
}) {
  const qc = useQueryClient();
  const { lessonId, view, hrefFor, go } = useLearnRoute(course);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawer, setDrawer] = useState(false);

  const courseQ = useQuery({ ...courseQuery(course), initialData: initialCourse ?? undefined });
  const progressQ = useQuery({ ...progressQuery(course), initialData: initialProgress ?? undefined, retry: false });
  const data = courseQ.data;

  const { groups, flat } = useMemo(() => (data ? flattenCurriculum(data) : { groups: [], flat: [] as FlatLesson[] }), [data]);
  const done = useMemo(() => completedSet(progressQ.data), [progressQ.data]);
  const locked = useMemo(() => lockedMap(progressQ.data), [progressQ.data]);
  const percent = progressQ.data?.percent ?? (flat.length ? (done.size / flat.length) * 100 : 0);

  const intent = useCallback(
    (id: number) => {
      void qc.prefetchQuery(lessonQuery(course, id));
      void qc.prefetchQuery(lessonProgressQuery(course, id));
    },
    [qc, course],
  );
  const navigate = useCallback(
    (id: number) => {
      intent(id);
      go(hrefFor(id));
      setDrawer(false);
    },
    [intent, go, hrefFor],
  );

  // Warm the neighbours of the current lesson so next/previous feel instant.
  useEffect(() => {
    if (lessonId === null) return;
    const i = flat.findIndex((l) => l.id === lessonId);
    [flat[i + 1], flat[i - 1]].forEach((l) => l && intent(l.id));
  }, [lessonId, flat, intent]);

  if (courseQ.isError && !data) {
    return <div className="mx-auto w-full max-w-3xl px-4 py-12"><QueryError error={courseQ.error} onRetry={() => courseQ.refetch()} backHref="/courses" loginNext={`/learn/${course}`} /></div>;
  }
  if (!data) return <ShellSkeleton />;

  const enrolled = data.is_enrolled;
  const accessible = (l: FlatLesson) => enrolled || l.is_preview;
  const activeLesson = lessonId !== null ? flat.find((l) => l.id === lessonId) : undefined;

  const sidebar = (
    <CurriculumSidebar
      groups={groups}
      activeId={lessonId}
      done={done}
      percent={percent}
      hrefFor={(id) => hrefFor(id)}
      onSelect={navigate}
      onIntent={intent}
      accessible={accessible}
      lockedReason={(id) => locked.get(id)}
    />
  );

  let content: React.ReactNode;
  if (flat.length === 0) {
    content = <EmptyState icon={<BookIcon />} title={m.noLessons} action={<Link href={`/courses/${data.slug}`} className={buttonStyles()}>{m.viewCourse}</Link>} />;
  } else if (lessonId === null || (!activeLesson && courseQ.isFetched)) {
    content = (
      <EmptyState
        icon={<BookIcon />}
        title={m.lessonNotFound}
        action={<Button onClick={() => navigate(flat[0].id)}>{m.curriculum}</Button>}
      />
    );
  } else if (view === "quiz") {
    content = <QuizRunner key={lessonId} course={course} lessonId={lessonId} onBack={() => go(hrefFor(lessonId))} />;
  } else {
    content = (
      <LessonView
        key={lessonId}
        course={course}
        courseData={data}
        lessonId={lessonId}
        flat={flat}
        completed={done.has(lessonId)}
        userId={userId}
        onNavigate={navigate}
        onOpenQuiz={(id) => go(hrefFor(id, true))}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col lg:h-[calc(100dvh-3.5rem)]">
      <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-2 sm:px-4">
        <Link href={`/courses/${data.slug}`} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-surface-muted hover:text-foreground">
          <ArrowLeftIcon size={16} /><span className="hidden sm:inline">{m.backToCourse}</span>
        </Link>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{data.title}</p>
        <div className="hidden items-center gap-2 text-xs text-muted sm:flex" aria-hidden>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-success transition-[width] duration-300" style={{ width: `${percent}%` }} /></div>
          {Math.round(percent)}%
        </div>
        <Button variant="outline" size="sm" className="hidden lg:inline-flex" aria-pressed={sidebarOpen} onClick={() => setSidebarOpen((o) => !o)}>
          <ListIcon size={14} />{sidebarOpen ? m.hideCurriculum : m.showCurriculum}
        </Button>
        <Button variant="outline" size="sm" className="lg:hidden" aria-expanded={drawer} onClick={() => setDrawer((o) => !o)}>
          <ListIcon size={14} />{m.curriculum}
        </Button>
      </div>

      <div className={cn("min-h-0 flex-1 lg:grid", sidebarOpen ? "lg:grid-cols-[22rem_1fr]" : "lg:grid-cols-[1fr]")}>
        {drawer && <div className="max-h-[60dvh] overflow-y-auto border-b border-border bg-surface lg:hidden">{sidebar}</div>}
        {sidebarOpen && <aside className="hidden min-h-0 overflow-y-auto border-r border-border bg-surface lg:block">{sidebar}</aside>}
        <div id="learn-content" className="min-h-0 min-w-0 overflow-y-auto">
          <div className={cn("mx-auto w-full px-4 py-6 sm:px-6", view === "quiz" ? "max-w-[100rem]" : "max-w-4xl")}>{content}</div>
        </div>
      </div>
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex flex-1 flex-col lg:h-[calc(100dvh-3.5rem)]" aria-busy="true" aria-label="Đang tải">
      <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2.5">
        <div className="h-6 w-6 animate-[flat-pulse_1.4s_ease-in-out_infinite] rounded bg-border" />
        <div className="h-5 w-64 animate-[flat-pulse_1.4s_ease-in-out_infinite] rounded bg-border" />
      </div>
      <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[22rem_1fr]">
        <aside className="hidden space-y-3 border-r border-border bg-surface p-4 lg:block">
          <div className="h-5 w-40 animate-[flat-pulse_1.4s_ease-in-out_infinite] rounded bg-border" />
          <div className="h-2 w-full animate-[flat-pulse_1.4s_ease-in-out_infinite] rounded bg-border" />
          {Array.from({ length: 8 }, (_, i) => <div key={i} className="h-10 w-full animate-[flat-pulse_1.4s_ease-in-out_infinite] rounded bg-border" />)}
        </aside>
        <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6 sm:px-6">
          <div className="h-8 w-2/3 animate-[flat-pulse_1.4s_ease-in-out_infinite] rounded bg-border" />
          <div className="aspect-video w-full animate-[flat-pulse_1.4s_ease-in-out_infinite] rounded-xl bg-border" />
        </div>
      </div>
    </div>
  );
}

export { ShellSkeleton };
