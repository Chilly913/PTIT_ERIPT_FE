"use client";

import { Combobox } from "@/components/ui/combobox";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, ClipboardCheckIcon, ExternalLinkIcon, FileTextIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { isApiError } from "@/lib/errors";
import { isNotReady, qk, useSubmissions } from "./api";
import { courseMessages as m } from "./messages";
import { LoadError, NotReady } from "./parts";
import type { Submission, SubmissionsResponse } from "./types";
import { fmtDateTime, fmtRelative } from "./utils";

const t = m.grading;

type Row = Submission & { lesson_id: number; lesson_title: string };

export function AssignmentsSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="mb-3 h-4 w-40" />
      <Skeleton className="mb-2 h-7 w-56" />
      <Skeleton className="mb-6 h-4 w-72" />
      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-2 rounded-xl border border-border bg-surface p-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
        <div className="hidden space-y-4 rounded-xl border border-border bg-surface p-5 lg:block">
          <Skeleton className="h-6 w-1/3" /><Skeleton className="h-20 w-full" /><Skeleton className="h-9 w-32" /><Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}

function GradePanel({ courseId, row, onBack }: { courseId: string; row: Row; onBack: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [grade, setGrade] = useState(row.grade ?? "");
  const [feedback, setFeedback] = useState(row.feedback ?? "");
  const [err, setErr] = useState<string | null>(null);
  const key = qk.submissions(courseId);

  const save = useMutation({
    mutationFn: (v: { grade: number; feedback: string }) => api.put(`/courses/${courseId}/assignments/submissions/${row.id}`, { grade: v.grade, feedback: v.feedback || null }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<SubmissionsResponse>(key);
      qc.setQueryData<SubmissionsResponse>(key, (d) => {
        if (!d) return d;
        const assignments = d.assignments.map((a) => {
          const subs = a.submissions.map((s) => (s.id === row.id ? { ...s, grade: v.grade.toFixed(2), feedback: v.feedback || s.feedback } : s));
          return { ...a, submissions: subs, ungraded_count: subs.filter((s) => s.grade == null).length };
        });
        return { ...d, assignments, summary: { ...d.summary, ungraded: assignments.reduce((n, a) => n + a.ungraded_count, 0) } };
      });
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      if (isApiError(e) && e.errors?.grade) setErr(e.errors.grade[0]);
      toast.error(isApiError(e) ? e.message : m.common.loadError);
    },
    onSuccess: () => toast.success(t.saved),
    onSettled: () => void qc.invalidateQueries({ queryKey: key }),
  });

  function submit() {
    const n = Number(grade.replace(",", "."));
    if (grade.trim() === "" || !Number.isFinite(n) || n < 0 || n > 10) return setErr(t.gradeInvalid);
    setErr(null);
    save.mutate({ grade: n, feedback: feedback.trim() });
  }

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onBack} aria-label={t.back}><ArrowLeftIcon className="size-4" /></Button>
        <Avatar name={row.user?.name ?? "?"} size="md" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{row.user?.name ?? "Học viên"}</p>
          <p className="truncate text-sm text-muted">{row.user?.email} · {row.lesson_title}</p>
        </div>
        <Badge tone={row.grade == null ? "warning" : "success"} className="ml-auto">{row.grade == null ? t.notGraded : `${Number(row.grade)}/10`}</Badge>
      </div>
      <div className="space-y-5 p-5">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-muted">{t.submittedAt}</dt><dd className="font-medium">{fmtDateTime(row.submitted_at)}</dd></div>
          <div>
            <dt className="text-muted">{t.file}</dt>
            <dd>
              {row.file_url ? (
                <a href={row.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
                  <FileTextIcon className="size-4" aria-hidden /> {t.openFile} <ExternalLinkIcon className="size-3.5" aria-hidden />
                </a>
              ) : <span className="text-muted">-</span>}
            </dd>
          </div>
        </dl>
        {row.student_note && (
          <div>
            <p className="mb-1 text-sm text-muted">{t.note}</p>
            <p className="rounded-lg bg-surface-subtle p-3 whitespace-pre-line">{row.student_note}</p>
          </div>
        )}
        <form className="space-y-4 border-t border-border pt-5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <Field label={t.grade} error={err} className="max-w-40">
            <Input value={grade} onChange={(e) => { setGrade(e.target.value.replace(/[^\d.,]/g, "")); setErr(null); }} inputMode="decimal" placeholder="0 - 10" />
          </Field>
          <Field label={t.feedback}>
            <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4} placeholder={t.feedbackPlaceholder} maxLength={2000} />
          </Field>
          <Button type="submit" loading={save.isPending}>{t.save}</Button>
        </form>
      </div>
    </div>
  );
}

export function AssignmentsPage({ courseId }: { courseId: string }) {
  const q = useSubmissions(courseId);
  const [filter, setFilter] = useState<"pending" | "graded" | "all">("pending");
  const [assignment, setAssignment] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  const all: Row[] = useMemo(
    () =>
      (q.data?.assignments ?? []).flatMap((a) => a.submissions.map((s) => ({ ...s, lesson_id: a.lesson_id, lesson_title: a.lesson_title }))).sort((a, b) => (b.submitted_at ?? "").localeCompare(a.submitted_at ?? "")),
    [q.data],
  );
  const rows = all.filter((r) => (filter === "all" ? true : filter === "pending" ? r.grade == null : r.grade != null) && (!assignment || String(r.lesson_id) === assignment));
  const current = all.find((r) => r.id === selected) ?? null;
  const summary = q.data?.summary;

  const header = (
    <>
      <Link href={`/studio/courses/${courseId}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeftIcon className="size-4" aria-hidden /> {q.data?.course.title ?? m.editor.back}
      </Link>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="mt-1 text-muted">{summary ? t.summary(summary.assignments, summary.submissions, summary.ungraded) : t.description}</p>
      </div>
    </>
  );

  if (q.isPending) return <AssignmentsSkeleton />;
  if (q.isError) return <>{header}{isNotReady(q.error) ? <NotReady /> : <LoadError onRetry={() => void q.refetch()} />}</>;

  return (
    <div>
      {header}
      {all.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface"><EmptyState icon={<ClipboardCheckIcon />} title={t.emptyTitle} description={t.emptyText} /></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <div className={cn("rounded-xl border border-border bg-surface", current && "hidden lg:block")}>
            <div className="space-y-2 border-b border-border p-3">
              <div className="flex gap-1" role="group" aria-label="Lọc bài nộp">
                {(["pending", "graded", "all"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={filter === f}
                    onClick={() => setFilter(f)}
                    className={cn("flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors", filter === f ? "bg-primary-soft text-primary-soft-foreground" : "text-muted hover:bg-surface-muted")}
                  >
                    {t[f]}
                    {f === "pending" && summary ? <span className="ml-1 tabular-nums">({summary.ungraded})</span> : null}
                  </button>
                ))}
              </div>
              {q.data.assignments.length > 1 && (
                <Combobox value={assignment} onChange={setAssignment} aria-label={t.allAssignments} placeholder={t.allAssignments} searchPlaceholder="Tìm bài tập..."
                  options={q.data.assignments.map((a) => ({ value: String(a.lesson_id), label: a.lesson_title }))} />
              )}
            </div>
            {rows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">{m.common.noResults}</p>
            ) : (
              <ul className="max-h-[calc(100dvh-16rem)] divide-y divide-border overflow-y-auto">
                {rows.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(r.id)}
                      aria-current={current?.id === r.id}
                      className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-subtle", current?.id === r.id && "bg-primary-soft hover:bg-primary-soft")}
                    >
                      <Avatar name={r.user?.name ?? "?"} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{r.user?.name ?? "Học viên"}</p>
                        <p className="truncate text-sm text-muted">{r.lesson_title} · {fmtRelative(r.submitted_at)}</p>
                      </div>
                      <Badge tone={r.grade == null ? "warning" : "success"}>{r.grade == null ? t.pending : Number(r.grade)}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={cn(!current && "hidden lg:block")}>
            {current ? (
              <GradePanel key={current.id} courseId={courseId} row={current} onBack={() => setSelected(null)} />
            ) : (
              <div className="rounded-xl border border-border bg-surface">
                <EmptyState icon={<ClipboardCheckIcon />} title={t.noneSelected} description={t.noneSelectedHint} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
