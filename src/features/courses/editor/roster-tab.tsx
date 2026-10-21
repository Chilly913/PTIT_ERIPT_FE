"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DownloadIcon, SearchIcon, TrashIcon, UserPlusIcon, UsersIcon } from "@/components/icons";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, ConfirmDialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { FileDropzone } from "@/components/file-dropzone";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { isApiError } from "@/lib/errors";
import type { Paginated } from "@/lib/types";
import { isNotReady, qk, useStudents } from "../api";
import { courseMessages as m } from "../messages";
import { LoadError, NotReady } from "../parts";
import type { AddStudentsResult, Student } from "../types";
import { fmtDate, fmtRelative } from "../utils";

const t = m.roster;
const PER_PAGE = 15;

function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-2" title={label}>
      <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
      <span className="w-9 text-right text-sm tabular-nums">{value}%</span>
    </div>
  );
}

function AddDialog({ courseId, open, onClose }: { courseId: number; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [text, setText] = useState("");
  const [result, setResult] = useState<AddStudentsResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: (input: string[] | File) => {
      if (input instanceof File) {
        const fd = new FormData();
        fd.append("file", input);
        return api.post<AddStudentsResult>(`/courses/${courseId}/students`, fd);
      }
      return api.post<AddStudentsResult>(`/courses/${courseId}/students`, { identifiers: input });
    },
    onSuccess: (r) => {
      setResult(r);
      if (r.enrolled) toast.success(t.addResult(r.enrolled, r.already));
      if (!r.not_found.length) {
        setText("");
        if (r.enrolled) onClose();
      } else {
        setText(r.not_found.join("\n"));
      }
      void qc.invalidateQueries({ queryKey: ["studio", "students", String(courseId)] });
      void qc.invalidateQueries({ queryKey: qk.myCoursesAll });
    },
    onError: (e) => setError(isApiError(e) ? e.message : m.common.loadError),
  });

  function submit() {
    const ids = Array.from(new Set(text.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean)));
    setError(null);
    setResult(null);
    if (ids.length) add.mutate(ids);
  }

  return (
    <Dialog
      open={open}
      onClose={() => { setResult(null); setError(null); onClose(); }}
      title={t.addTitle}
      description={t.addHint}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{m.common.cancel}</Button>
          <Button onClick={submit} loading={add.isPending} disabled={!text.trim()}>{t.addSubmit}</Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <Alert tone="danger">{error}</Alert>}
        {result && result.enrolled === 0 && result.already > 0 && <Alert tone="info">{t.addResult(0, result.already)}</Alert>}
        {result && result.not_found.length > 0 && <Alert tone="warning">{t.notFound} {result.not_found.join(", ")}</Alert>}
        <p className="text-sm text-muted">
          Có sẵn danh sách trong Excel? <a href={`/bff/courses/${courseId}/student-template`} download className="font-medium text-primary underline underline-offset-2">Tải file mẫu</a> rồi kéo thả vào đây (cột A: email hoặc mã sinh viên).
        </p>
        <FileDropzone accept=".xlsx" maxBytes={5 * 1024 * 1024} label="Chọn tệp Excel danh sách học viên" disabled={add.isPending} onReject={setError} onFile={(f) => { setError(null); setResult(null); add.mutate(f); }}>
          {({ dragging }) => (
            <span className="flex min-h-20 flex-col items-center justify-center gap-1 px-4 py-3 text-center">
              <span className="text-sm font-medium">{dragging ? "Thả tệp Excel để thêm" : "Kéo thả tệp Excel (.xlsx) vào đây"}</span>
              <span className="text-xs text-muted">hoặc <span className="font-medium text-primary underline underline-offset-2">bấm để chọn tệp</span> · hoặc gõ danh sách bên dưới</span>
            </span>
          )}
        </FileDropzone>
        <Field>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder={t.addPlaceholder} aria-label={t.addTitle} />
        </Field>
      </div>
    </Dialog>
  );
}

export function RosterTab({ courseId }: { courseId: number }) {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [progress, setProgress] = useState("");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [toRemove, setToRemove] = useState<Student | null>(null);
  const qc = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    const id = window.setTimeout(() => setDq(q.trim()), 250);
    return () => window.clearTimeout(id);
  }, [q]);

  const params = { page, per_page: PER_PAGE, q: dq || undefined, progress: progress || undefined, sort: "-enrolled_at" };
  const list = useStudents(courseId, params);

  const remove = useMutation({
    mutationFn: (s: Student) => api.delete(`/courses/${courseId}/students/${s.user.id}`),
    onMutate: async (s) => {
      await qc.cancelQueries({ queryKey: ["studio", "students", String(courseId)] });
      const snap = qc.getQueriesData<Paginated<Student>>({ queryKey: ["studio", "students", String(courseId)] });
      qc.setQueriesData<Paginated<Student>>({ queryKey: ["studio", "students", String(courseId)] }, (l) =>
        l ? { ...l, data: l.data.filter((x) => x.enrollment_id !== s.enrollment_id), meta: { ...l.meta, total: Math.max(0, l.meta.total - 1) } } : l,
      );
      return { snap };
    },
    onError: (e, _s, ctx) => {
      ctx?.snap.forEach(([k, d]) => qc.setQueryData(k, d));
      toast.error(isApiError(e) ? e.message : m.common.loadError);
    },
    onSuccess: () => toast.success(t.removed),
    onSettled: () => void qc.invalidateQueries({ queryKey: ["studio"] }),
  });

  if (list.isError && isNotReady(list.error)) return <NotReady />;
  const rows = list.data?.data ?? [];
  const qs = new URLSearchParams();
  if (dq) qs.set("q", dq);
  if (progress) qs.set("progress", progress);
  const exportHref = `/bff/courses/${courseId}/students/export${qs.toString() ? `?${qs}` : ""}`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t.title}</h2>
          <p className="text-sm text-muted">{list.data ? t.total(list.data.meta.total) : " "}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={exportHref} download className="inline-flex h-9 items-center gap-2 rounded-lg border border-(--btn-outline-border) bg-(--btn-outline-bg) px-4 font-medium text-(color:--btn-outline-fg) transition-colors hover:bg-(--btn-outline-hover)">
            <DownloadIcon className="size-4" aria-hidden /> {t.export}
          </a>
          <Button onClick={() => setAdding(true)}><UserPlusIcon className="size-4" aria-hidden /> {t.add}</Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-48 flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={t.search} aria-label={t.search} className="pl-9" />
          </div>
          <div className="w-full sm:w-44">
            <Select value={progress} onChange={(e) => { setProgress(e.target.value); setPage(1); }} aria-label={t.progressAll}>
              <option value="">{t.progressAll}</option>
              {Object.entries(t.progress).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
        </div>

        {list.isPending ? (
          <div className="divide-y divide-(--table-divider) border-t border-border" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3"><Skeleton className="size-8 rounded-full" /><div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/4" /></div><Skeleton className="h-3 w-24" /></div>
            ))}
          </div>
        ) : list.isError ? (
          <div className="border-t border-border"><LoadError onRetry={() => void list.refetch()} /></div>
        ) : rows.length === 0 ? (
          <div className="border-t border-border">
            <EmptyState icon={<UsersIcon />} title={dq || progress ? m.list.emptyFiltered : t.empty} description={dq || progress ? m.common.noResults : t.emptyText} />
          </div>
        ) : (
          <div className={list.isFetching ? "opacity-70 transition-opacity" : "transition-opacity"}>
            <div className="hidden border-t border-b border-(--table-divider) bg-(--table-header-bg) px-4 py-2.5 text-xs font-semibold tracking-wide text-(color:--table-header-fg) uppercase md:grid md:grid-cols-[minmax(0,1fr)_11rem_6rem_6rem_6rem_2rem] md:gap-4">
              <span>{t.cols.student}</span><span>{t.cols.progress}</span><span>{t.cols.source}</span><span>{t.cols.enrolled}</span><span>{t.cols.last}</span><span />
            </div>
            <ul className="divide-y divide-(--table-divider) border-t border-border md:border-t-0">
              {rows.map((s) => (
                <li key={s.enrollment_id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-4 py-3 hover:bg-(--table-row-hover) md:grid-cols-[minmax(0,1fr)_11rem_6rem_6rem_6rem_2rem]">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={s.user.name} src={s.user.avatar} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.user.name}</p>
                      <p className="truncate text-sm text-muted">{s.user.email}{s.user.student_code ? ` · ${s.user.student_code}` : ""}</p>
                    </div>
                  </div>
                  <div className="order-last col-span-2 md:order-none md:col-span-1">
                    <ProgressBar value={s.progress_percent} label={`${t.lessonsDone(s.completed_lessons, s.total_lessons)} · ${t.progress[s.progress_state]}`} />
                    <p className="mt-0.5 text-xs text-muted md:hidden">{t.lessonsDone(s.completed_lessons, s.total_lessons)}</p>
                  </div>
                  <span className="hidden text-sm text-muted md:block">{t.source[s.source] ?? s.source}</span>
                  <span className="hidden text-sm text-muted md:block">{fmtDate(s.enrolled_at)}</span>
                  <span className="hidden text-sm text-muted md:block">{s.last_activity_at ? fmtRelative(s.last_activity_at) : t.never}</span>
                  <Button variant="ghost" size="icon" className="size-8 justify-self-end" onClick={() => setToRemove(s)} aria-label={`${t.remove}: ${s.user.name}`}>
                    <TrashIcon className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Pagination meta={list.data?.meta} onPageChange={setPage} disabled={list.isFetching} />
      </div>

      {adding && <AddDialog courseId={courseId} open onClose={() => setAdding(false)} />}
      <ConfirmDialog
        open={!!toRemove}
        onClose={() => setToRemove(null)}
        destructive
        title={t.removeTitle}
        description={toRemove ? t.removeText(toRemove.user.name) : undefined}
        confirmLabel={t.remove}
        onConfirm={() => { if (toRemove) remove.mutate(toRemove); setToRemove(null); }}
      />
    </div>
  );
}
