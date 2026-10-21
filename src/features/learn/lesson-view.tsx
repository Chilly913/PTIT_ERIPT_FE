"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";
import { ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon, CheckIcon } from "@/components/icons";
import { KeyboardIcon } from "@/components/icons/icons-learn";
import { ClientHtml } from "@/components/site/client-html";
import { QueryError } from "@/components/site/query-state";
import { LessonTypeIcon, lessonTypeLabel } from "@/features/site/lesson-type";
import { ReviewsPanel } from "@/features/site/reviews";
import type { CourseDetail, LessonDetail } from "@/features/site/types";
import { lessonProgressQuery, lessonQuery, type FlatLesson } from "./api";
import { AssignmentPanel } from "./assignment-panel";
import { DocumentCard, OfflineCard, QuizCard, VirtualClassCard } from "./lesson-blocks";
import { MediaPlayer, type PlayerBridge } from "./media-player";
import { learnMessages as m } from "./messages";
import { NotesTab } from "./notes-tab";
import { QaTab } from "./qa-tab";
import { ResourcesTab } from "./resources-tab";
import { ScormFrame } from "./scorm-frame";
import { useSetCompleted } from "./use-completion";

const MEDIA = new Set(["video", "audio"]);
const VIRTUAL = new Set(["virtual_class", "zoom", "meet", "live"]);

function LessonSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label={m.loadingLesson}>
      <Skeleton className="aspect-video w-full rounded-xl" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-4/5" />
    </div>
  );
}

function LessonBody({
  course,
  courseData,
  lesson,
  completed,
  bridge,
  onComplete,
  onOpenQuiz,
}: {
  course: string;
  courseData: CourseDetail;
  lesson: LessonDetail;
  completed: boolean;
  bridge: React.RefObject<PlayerBridge | null>;
  onComplete: (watched: number) => void;
  onOpenQuiz: () => void;
}) {
  const media = MEDIA.has(lesson.type);
  const lp = useQuery({ ...lessonProgressQuery(course, lesson.id), enabled: media });
  const type = lesson.type;

  if (media && lp.isPending) return <Skeleton className="aspect-video w-full rounded-xl" />;

  if (media) {
    return (
      <MediaPlayer
        course={course}
        lessonId={lesson.id}
        url={lesson.video_url ?? ""}
        kind={type === "audio" ? "audio" : "video"}
        duration={lesson.duration}
        initialPosition={lp.data?.last_position ?? 0}
        initialWatched={lp.data?.watched_seconds ?? 0}
        completed={completed}
        bridgeRef={bridge}
        onAutoComplete={onComplete}
      />
    );
  }
  if (type === "page") return <div className="rounded-xl border border-border bg-surface p-5 sm:p-8"><ClientHtml html={lesson.description} /></div>;
  if (type === "document" || type === "file") return <DocumentCard url={lesson.video_url} />;
  if ((type === "scorm" || type === "h5p") && lesson.scorm_package) {
    return <ScormFrame course={course} lessonId={lesson.id} pkg={lesson.scorm_package} onCompleted={() => onComplete(lesson.duration)} />;
  }
  if (type === "scorm" || type === "h5p") return <Alert tone="info">{m.scorm.none}</Alert>;
  if (VIRTUAL.has(type)) return <VirtualClassCard vc={lesson.virtual_class} />;
  if (type === "offline") return lesson.offline_session ? <OfflineCard s={lesson.offline_session} /> : <Alert tone="info">{m.virtual.none}</Alert>;
  if (type === "assignment") {
    return lesson.assignment ? <AssignmentPanel course={course} lessonId={lesson.id} assignment={lesson.assignment} /> : <Alert tone="info">{m.assignment.closed}</Alert>;
  }
  if (type === "quiz") return <QuizCard quiz={lesson.quiz} lessonId={lesson.id} onStart={onOpenQuiz} />;
  void courseData;
  return <Alert tone="info" title={m.unsupported.title}>{m.unsupported.text}</Alert>;
}

export function LessonView({
  course,
  courseData,
  lessonId,
  flat,
  completed,
  userId,
  onNavigate,
  onOpenQuiz,
}: {
  course: string;
  courseData: CourseDetail;
  lessonId: number;
  flat: FlatLesson[];
  completed: boolean;
  userId: number;
  onNavigate: (id: number) => void;
  onOpenQuiz: (id: number) => void;
}) {
  const bridge = useRef<PlayerBridge | null>(null);
  const [tab, setTab] = useState("notes");
  const q = useQuery(lessonQuery(course, lessonId));
  const lp = useQuery({ ...lessonProgressQuery(course, lessonId), enabled: false });
  const setCompleted = useSetCompleted(course, lessonId);

  const idx = flat.findIndex((l) => l.id === lessonId);
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx >= 0 && idx < flat.length - 1 ? flat[idx + 1] : null;
  const lesson = q.data;

  const toggle = () => {
    const watched = lp.data?.watched_seconds ?? lesson?.duration ?? 0;
    setCompleted.mutate({ completed: !completed, watched: completed ? watched : Math.max(watched, 0) });
  };

  // Keyboard shortcuts: N next, P previous, M toggle complete (ignored while typing).
  const nav = useRef({ prev, next, toggle });
  useEffect(() => {
    nav.current = { prev, next, toggle };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      const k = e.key.toLowerCase();
      if (k === "n" && nav.current.next) onNavigate(nav.current.next.id);
      else if (k === "p" && nav.current.prev) onNavigate(nav.current.prev.id);
      else if (k === "m") nav.current.toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNavigate]);

  useEffect(() => {
    if (lesson) document.title = `${lesson.title} | ${courseData.title}`;
  }, [lesson, courseData.title]);

  if (q.isPending) return <LessonSkeleton />;
  if (q.isError || !lesson) {
    return <QueryError error={q.error} onRetry={() => q.refetch()} backHref={`/courses/${courseData.slug}`} loginNext={`/learn/${course}/${lessonId}`} />;
  }

  const isMedia = MEDIA.has(lesson.type);
  const showDescription = lesson.type !== "page" && !!lesson.description?.trim();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm text-muted">
            <LessonTypeIcon type={lesson.type} />{lessonTypeLabel(lesson.type)}
            {idx >= 0 && <span>· {m.lessonOf(idx + 1, flat.length)}</span>}
            {lesson.is_preview && <Badge tone="primary">{m.preview}</Badge>}
          </p>
          <h1 className="mt-1 text-2xl leading-snug font-bold">{lesson.title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Tooltip content={m.shortcutsText} side="bottom">
            <button type="button" aria-label={`${m.shortcuts}: ${m.shortcutsText}`} className="inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-muted hover:text-foreground">
              <KeyboardIcon size={18} />
            </button>
          </Tooltip>
          <Button variant={completed ? "secondary" : "primary"} onClick={toggle} aria-pressed={completed}>
            {completed ? <CheckCircleIcon size={16} className="text-success" /> : <CheckIcon size={16} />}
            {completed ? m.completed : m.markComplete}
          </Button>
        </div>
      </div>

      <LessonBody
        key={lesson.id}
        course={course}
        courseData={courseData}
        lesson={lesson}
        completed={completed}
        bridge={bridge}
        onComplete={(watched) => setCompleted.mutate({ completed: true, watched })}
        onOpenQuiz={() => onOpenQuiz(lesson.id)}
      />

      {showDescription && (
        <section aria-label={m.tabs.about} className="rounded-xl border border-border bg-surface p-5">
          <ClientHtml html={lesson.description} />
        </section>
      )}

      <nav aria-label="Chuyển bài" className="flex items-center justify-between gap-3 border-y border-border py-3">
        {prev ? (
          <Button variant="outline" onClick={() => onNavigate(prev.id)}><ChevronLeftIcon size={16} /><span className="max-w-40 truncate sm:max-w-64">{m.prev}</span></Button>
        ) : <span />}
        {next ? (
          <Button onClick={() => onNavigate(next.id)}><span className="max-w-40 truncate sm:max-w-64">{m.next}</span><ChevronRightIcon size={16} /></Button>
        ) : <span />}
      </nav>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList label="Thông tin bài học">
          <TabsTrigger value="notes">{m.tabs.notes}</TabsTrigger>
          <TabsTrigger value="qa">{m.tabs.qa}</TabsTrigger>
          <TabsTrigger value="resources">{m.tabs.resources}{lesson.attachments.length ? ` (${lesson.attachments.length})` : ""}</TabsTrigger>
          <TabsTrigger value="reviews">{m.tabs.reviews}</TabsTrigger>
        </TabsList>
        <TabsContent value="notes"><NotesTab course={course} lessonId={lesson.id} bridge={bridge} timestamped={isMedia} /></TabsContent>
        <TabsContent value="qa"><QaTab course={course} courseId={courseData.id} lessonId={lesson.id} instructorId={courseData.user_id} userId={userId} /></TabsContent>
        <TabsContent value="resources"><ResourcesTab attachments={lesson.attachments} /></TabsContent>
        <TabsContent value="reviews"><ReviewsPanel courseId={courseData.id} userId={userId} isEnrolled={courseData.is_enrolled} /></TabsContent>
      </Tabs>
    </div>
  );
}
