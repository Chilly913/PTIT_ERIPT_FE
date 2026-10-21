"use client";

import { Combobox } from "@/components/ui/combobox";
import Link from "next/link";
import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, ExternalLinkIcon, SearchIcon, XIcon, BookIcon } from "@/components/icons";
import { Alert } from "@/components/ui/alert";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { isApiError } from "@/lib/errors";
import { Drawer } from "@/features/studio/drawer";
import { SafeHtml } from "@/features/studio/rich-text-editor";
import { isNotReady, qk, useCategories } from "../api";
import { courseMessages as m } from "../messages";
import { LoadError, StatusBadge, Thumb } from "../parts";
import type { Course, CourseListResponse, CourseStatus } from "../types";
import { fmtDate, fmtNumber, fmtPrice, fmtRelative, STATUS_ORDER } from "../utils";

const t = m.admin;
const PER_PAGE = 15;

export function AdminCoursesSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="h-7 w-40" />
      <Skeleton className="mt-2 mb-6 h-4 w-80" />
      <Card>
        <div className="flex flex-wrap gap-3 p-4"><Skeleton className="h-9 min-w-48 flex-1" /><Skeleton className="h-9 w-40" /><Skeleton className="h-9 w-40" /><Skeleton className="h-9 w-32" /></div>
        <div className="divide-y divide-(--table-divider) border-t border-border">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="flex items-center gap-4 px-4 py-3"><Skeleton className="h-12 w-20" /><Skeleton className="h-4 w-1/3" /><Skeleton className="ml-auto h-5 w-20" /></div>)}
        </div>
      </Card>
    </div>
  );
}

type Source = "admin" | "public";

/** Planned admin API with a public-catalog fallback when the route is not deployed yet (404). */
async function fetchCourses(p: { page: number; q: string; status: string; category: string; instructor: string }) {
  try {
    const res = await api.get<CourseListResponse>("/admin/courses", {
      query: { page: p.page, per_page: PER_PAGE, q: p.q, status: p.status, category_id: p.category, instructor_id: p.instructor },
    });
    return { source: "admin" as Source, ...res };
  } catch (e) {
    if (!isNotReady(e)) throw e;
    const res = await api.get<CourseListResponse>("/courses", {
      query: { page: p.page, per_page: PER_PAGE, search: p.q, status: p.status || "pending_review", category: p.category, instructor_id: p.instructor },
    });
    return { source: "public" as Source, ...res };
  }
}

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}

function Detail({ course, onClose, onApprove, onReject, pendingNote }: { course: Course; onClose: () => void; onApprove: () => void; onReject: () => void; pendingNote: boolean }) {
  const full = useQuery({ queryKey: qk.course(course.id), queryFn: () => api.get<Course>(`/courses/${course.id}`), staleTime: 30_000 });
  const c = { ...course, ...(full.data ?? {}) };
  return (
    <Drawer
      open
      onRequestClose={onClose}
      title={c.title}
      description={t.detail}
      footer={
        <>
          <Link href={`/studio/courses/${c.id}`} className={buttonStyles({ variant: "outline" })}><ExternalLinkIcon className="size-4" aria-hidden /> {t.openStudio}</Link>
          <Button variant="outline" onClick={onReject}><XIcon className="size-4" aria-hidden /> {t.reject}</Button>
          <Button onClick={onApprove}><CheckIcon className="size-4" aria-hidden /> {t.approve}</Button>
        </>
      }
    >
      <div className="space-y-5">
        {pendingNote && <Alert tone="info" title={t.modPending}>{t.modPendingHint}</Alert>}
        <Thumb src={c.thumbnail} className="w-full" />
        <div className="flex flex-wrap items-center gap-2"><StatusBadge status={c.status} />{c.category && <span className="text-sm text-muted">{c.category.name}</span>}</div>
        {c.status === "rejected" && c.reject_reason && <Alert tone="danger" title={t.rejectReason}>{c.reject_reason}</Alert>}
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-muted">{t.cols.instructor}</dt><dd className="font-medium">{c.instructor?.name ?? "-"}</dd></div>
          <div><dt className="text-muted">{t.price}</dt><dd className="font-medium">{fmtPrice(c.price)}</dd></div>
          <div><dt className="text-muted">{t.lessons}</dt><dd className="font-medium">{fmtNumber(c.lessons_count ?? 0)}</dd></div>
          <div><dt className="text-muted">{t.cols.students}</dt><dd className="font-medium">{fmtNumber(c.enrollments_count ?? 0)}</dd></div>
          <div><dt className="text-muted">{t.createdAt}</dt><dd className="font-medium">{fmtDate(c.created_at)}</dd></div>
          <div><dt className="text-muted">{t.cols.updated}</dt><dd className="font-medium">{fmtRelative(c.updated_at)}</dd></div>
        </dl>
        {full.isPending ? <Skeleton className="h-24 w-full" /> : c.description ? <SafeHtml html={c.description} /> : null}
      </div>
    </Drawer>
  );
}

export function AdminCoursesPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [instructor, setInstructor] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Course | null>(null);
  const [rejecting, setRejecting] = useState<Course | null>(null);
  const [reason, setReason] = useState("");
  const [reasonErr, setReasonErr] = useState<string | null>(null);
  const [modUnavailable, setModUnavailable] = useState(false);
  const toast = useToast();
  const qc = useQueryClient();
  const categories = useCategories();
  const dq = useDebounced(q.trim());
  const di = useDebounced(instructor.replace(/\D/g, ""));

  const list = useQuery({
    queryKey: qk.adminCourses({ page, dq, status, category, di }),
    queryFn: () => fetchCourses({ page, q: dq, status, category, instructor: di }),
    placeholderData: keepPreviousData,
    retry: false,
  });
  const fallback = list.data?.source === "public";

  const moderate = useMutation({
    mutationFn: ({ course, action, reason: r }: { course: Course; action: "approve" | "reject"; reason?: string }) =>
      action === "approve" ? api.put(`/admin/courses/${course.id}/approve`) : api.put(`/admin/courses/${course.id}/reject`, { reason: r }),
    onSuccess: (_d, v) => {
      toast.success(v.action === "approve" ? t.approved : t.rejected);
      setDetail(null);
      setRejecting(null);
      setReason("");
      void qc.invalidateQueries({ queryKey: ["studio"] });
    },
    onError: (e) => {
      if (isNotReady(e)) {
        setModUnavailable(true);
        setRejecting(null);
        toast.info(t.modPending, t.modPendingHint);
      } else toast.error(isApiError(e) ? e.message : m.common.loadError);
    },
  });

  function confirmReject() {
    if (!reason.trim()) return setReasonErr(t.rejectRequired);
    setReasonErr(null);
    if (rejecting) moderate.mutate({ course: rejecting, action: "reject", reason: reason.trim() });
  }

  const rows = list.data?.data ?? [];

  return (
    <>
      <PageHeader title={t.title} description={t.description} />
      {(fallback || modUnavailable) && (
        <Alert tone="info" title={t.modPending} className="mb-4">
          {t.modPendingHint} {fallback ? t.fallbackNote : ""}
        </Alert>
      )}
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-48 flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={t.search} aria-label={t.search} className="pl-9" />
          </div>
          <div className="w-full sm:w-40">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label={t.status}>
              {!fallback && <option value="">{m.list.statusAll}</option>}
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{m.status[s as CourseStatus]}</option>)}
            </Select>
          </div>
          <div className="w-full sm:w-44">
            <Combobox value={category} onChange={(v) => { setCategory(v); setPage(1); }} aria-label={t.category} placeholder={t.allCategories} searchPlaceholder="Tìm danh mục..."
              options={(categories.data ?? []).map((c) => ({ value: String(c.id), label: c.label }))} />
          </div>
          <div className="w-full sm:w-36">
            <Input value={instructor} onChange={(e) => { setInstructor(e.target.value); setPage(1); }} placeholder={t.instructor} aria-label={t.instructor} inputMode="numeric" />
          </div>
        </div>

        {list.isPending ? (
          <div className="divide-y divide-(--table-divider) border-t border-border" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="flex items-center gap-4 px-4 py-3"><Skeleton className="h-12 w-20" /><Skeleton className="h-4 w-1/3" /><Skeleton className="ml-auto h-5 w-20" /></div>)}
          </div>
        ) : list.isError ? (
          <div className="border-t border-border"><LoadError onRetry={() => void list.refetch()} /></div>
        ) : rows.length === 0 ? (
          <div className="border-t border-border"><EmptyState icon={<BookIcon />} title={t.empty} description={m.common.noResults} /></div>
        ) : (
          <div className={list.isFetching ? "opacity-70 transition-opacity" : "transition-opacity"}>
            <div className="hidden border-t border-b border-(--table-divider) bg-(--table-header-bg) px-4 py-2.5 text-xs font-semibold tracking-wide text-(color:--table-header-fg) uppercase md:grid md:grid-cols-[minmax(0,1fr)_10rem_7rem_5rem_7rem] md:gap-4">
              <span>{t.cols.course}</span><span>{t.cols.instructor}</span><span>{t.cols.status}</span><span className="text-right">{t.cols.students}</span><span>{t.cols.updated}</span>
            </div>
            <ul className="divide-y divide-(--table-divider) border-t border-border md:border-t-0">
              {rows.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setDetail(c)} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 text-left transition-colors hover:bg-(--table-row-hover) md:grid-cols-[minmax(0,1fr)_10rem_7rem_5rem_7rem]">
                    <span className="flex min-w-0 items-center gap-3">
                      <Thumb src={c.thumbnail} className="h-12 w-20" rounded="rounded-md" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{c.title}</span>
                        <span className="block truncate text-sm text-muted">{c.category?.name ?? "-"}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted md:hidden">{c.instructor?.name}</span>
                      </span>
                    </span>
                    <span className="hidden truncate text-sm md:block">{c.instructor?.name ?? "-"}</span>
                    <span><StatusBadge status={c.status} /></span>
                    <span className="hidden text-right tabular-nums md:block">{fmtNumber(c.enrollments_count ?? 0)}</span>
                    <span className="hidden text-sm text-muted md:block">{fmtRelative(c.updated_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Pagination meta={list.data?.meta} onPageChange={setPage} disabled={list.isFetching} />
      </Card>

      {detail && (
        <Detail
          course={detail}
          onClose={() => setDetail(null)}
          pendingNote={modUnavailable}
          onApprove={() => moderate.mutate({ course: detail, action: "approve" })}
          onReject={() => { setRejecting(detail); setReason(""); setReasonErr(null); }}
        />
      )}
      <Dialog
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        title={t.rejectTitle}
        description={rejecting?.title}
        size="sm"
        dismissable={!moderate.isPending}
        footer={
          <>
            <Button variant="outline" onClick={() => setRejecting(null)} disabled={moderate.isPending}>{m.common.cancel}</Button>
            <Button variant="danger" onClick={confirmReject} loading={moderate.isPending}>{t.reject}</Button>
          </>
        }
      >
        <Field label={t.rejectReason} hint={t.rejectReasonHint} error={reasonErr} required>
          <Textarea value={reason} onChange={(e) => { setReason(e.target.value); setReasonErr(null); }} rows={4} maxLength={1000} />
        </Field>
      </Dialog>
    </>
  );
}
