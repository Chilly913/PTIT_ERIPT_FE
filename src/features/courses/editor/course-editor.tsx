"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { ArrowLeftIcon, ClipboardCheckIcon, EyeIcon } from "@/components/icons";
import { buttonStyles } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPanel } from "@/components/status-panel";
import { isApiError } from "@/lib/errors";
import { useCourse } from "../api";
import { courseMessages as m } from "../messages";
import { LoadError, StatusBadge } from "../parts";
import { CurriculumTab } from "./curriculum-tab";
import { FeedbackTab } from "./feedback-tab";
import { InfoTab } from "./info-tab";
import { PublishTab } from "./publish-tab";
import { ReportTab } from "./report-tab";
import { RosterTab } from "./roster-tab";

const TABS = ["info", "curriculum", "students", "report", "feedback", "publish"] as const;
type Tab = (typeof TABS)[number];
const t = m.editor;

export function EditorSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="mb-3 h-4 w-40" />
      <div className="mb-5 flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-80 max-w-full" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="mb-6 flex gap-4 border-b border-border pb-2.5">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-5 w-20" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-9" /><Skeleton className="h-9" /></div>
          </div>
          <div className="space-y-3 rounded-xl border border-border bg-surface p-5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-44 w-full" />
          </div>
        </div>
        <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </div>
  );
}

export function CourseEditor({ courseId }: { courseId: string | null }) {
  const sp = useSearchParams();
  const initial = (TABS as readonly string[]).includes(sp.get("tab") ?? "") ? (sp.get("tab") as Tab) : "info";
  const [tab, setTab] = useState<Tab>(courseId ? initial : "info");
  const [visited, setVisited] = useState<Set<Tab>>(new Set([courseId ? initial : "info"]));
  const [infoDirty, setInfoDirty] = useState(false);
  const course = useCourse(courseId);

  const go = useCallback((next: string) => {
    const n = next as Tab;
    setTab(n);
    setVisited((v) => (v.has(n) ? v : new Set(v).add(n)));
    const url = new URL(window.location.href);
    if (n === "info") url.searchParams.delete("tab");
    else url.searchParams.set("tab", n);
    window.history.replaceState(null, "", url);
  }, []);

  if (courseId && course.isPending) return <EditorSkeleton />;
  if (courseId && course.isError) {
    const nf = isApiError(course.error) && course.error.status === 404;
    return nf ? (
      <StatusPanel code="404" title="Không tìm thấy khóa học" text="Khóa học không tồn tại hoặc đã bị xóa." actions={<Link href="/studio/courses" className={buttonStyles()}>{t.back}</Link>} />
    ) : (
      <LoadError onRetry={() => void course.refetch()} />
    );
  }

  const c = course.data ?? null;
  const numericId = c?.id ?? null;
  const labels: Record<Tab, string> = t.tabs;

  return (
    <div>
      <Link href="/studio/courses" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeftIcon className="size-4" aria-hidden /> {t.back}
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-bold tracking-tight">
            <span className="min-w-0 truncate">{c ? c.title : t.newTitle}</span>
            {c && <StatusBadge status={c.status} />}
          </h1>
          {!c && <p className="mt-1 text-muted">{t.newDescription}</p>}
        </div>
        {c && (
          <div className="flex flex-wrap gap-2">
            <Link href={`/studio/courses/${c.id}/assignments`} className={buttonStyles({ variant: "outline" })}>
              <ClipboardCheckIcon className="size-4" aria-hidden /> {t.assignments}
            </Link>
            <a href={`/courses/${c.slug}`} target="_blank" rel="noopener noreferrer" className={buttonStyles({ variant: "outline" })}>
              <EyeIcon className="size-4" aria-hidden /> {t.preview}
            </a>
          </div>
        )}
      </div>

      <div role="tablist" aria-label="Biên tập khóa học" className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((k) => {
          const disabled = !c && k !== "info";
          const active = tab === k;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              id={`tab-${k}`}
              aria-selected={active}
              aria-controls={`panel-${k}`}
              disabled={disabled}
              title={disabled ? t.saveFirst : undefined}
              onClick={() => go(k)}
              className={`-mb-px border-b-2 px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${active ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"}`}
            >
              {labels[k]}
              {k === "info" && infoDirty && <span className="ml-1.5 inline-block size-1.5 rounded-full bg-warning align-middle" aria-label="Chưa lưu" />}
            </button>
          );
        })}
      </div>

      {/* Panels stay mounted once visited so unsaved edits survive tab switches. */}
      <div id="panel-info" role="tabpanel" aria-labelledby="tab-info" hidden={tab !== "info"}>
        <InfoTab course={c} onDirtyChange={setInfoDirty} />
      </div>
      {c && numericId != null && (
        <>
          {visited.has("curriculum") && (
            <div id="panel-curriculum" role="tabpanel" aria-labelledby="tab-curriculum" hidden={tab !== "curriculum"}>
              <CurriculumTab courseId={numericId} courseTitle={c.title} />
            </div>
          )}
          {visited.has("students") && (
            <div id="panel-students" role="tabpanel" aria-labelledby="tab-students" hidden={tab !== "students"}>
              <RosterTab courseId={numericId} />
            </div>
          )}
          {visited.has("report") && (
            <div id="panel-report" role="tabpanel" aria-labelledby="tab-report" hidden={tab !== "report"}>
              <ReportTab courseId={numericId} />
            </div>
          )}
          {visited.has("feedback") && (
            <div id="panel-feedback" role="tabpanel" aria-labelledby="tab-feedback" hidden={tab !== "feedback"}>
              <FeedbackTab course={c} />
            </div>
          )}
          {visited.has("publish") && (
            <div id="panel-publish" role="tabpanel" aria-labelledby="tab-publish" hidden={tab !== "publish"}>
              <PublishTab course={c} onGoto={go} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
