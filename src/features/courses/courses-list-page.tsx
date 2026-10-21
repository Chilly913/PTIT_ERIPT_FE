"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookIcon, EditIcon, EyeIcon, MoreHorizontalIcon, PlusIcon, SearchIcon, SendIcon, StarIcon, TrashIcon, UsersIcon, EyeOffIcon } from "@/components/icons";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { isApiError } from "@/lib/errors";
import { qk, useMyCourses, type MyCoursesParams } from "./api";
import { courseMessages as m } from "./messages";
import { LoadError, StatusBadge, Thumb } from "./parts";
import type { Course, CourseListResponse, CourseStatus } from "./types";
import { fmtNumber, fmtRelative, STATUS_ORDER } from "./utils";

const PER_PAGE = 10;
const t = m.list;

function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}

export function CoursesListSkeleton() {
  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <Card>
        <div className="flex flex-wrap gap-3 p-4">
          <Skeleton className="h-9 min-w-48 flex-1" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="divide-y divide-(--table-divider) border-t border-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-12 w-20 shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="hidden h-5 w-20 md:block" />
              <Skeleton className="hidden h-4 w-12 md:block" />
              <Skeleton className="size-8" />
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function RowMenu({ course, onDelete, onSubmit, onUnpublish }: { course: Course; onDelete: () => void; onSubmit: () => void; onUnpublish: () => void }) {
  const canSubmit = course.status === "draft" || course.status === "rejected";
  return (
    <Dropdown>
      <DropdownTrigger className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface-muted hover:text-foreground" aria-label={`${t.rowActions}: ${course.title}`}>
        <MoreHorizontalIcon className="size-4" />
      </DropdownTrigger>
      <DropdownContent align="end">
        <DropdownItem href={`/studio/courses/${course.id}`}><EditIcon className="size-4" /> {t.menu.edit}</DropdownItem>
        <DropdownItem href={`/studio/courses/${course.id}?tab=students`}><UsersIcon className="size-4" /> {t.menu.roster}</DropdownItem>
        <DropdownItem onSelect={() => window.open(`/courses/${course.slug}`, "_blank", "noopener")}><EyeIcon className="size-4" /> {t.menu.preview}</DropdownItem>
        {canSubmit && <DropdownItem onSelect={onSubmit}><SendIcon className="size-4" /> {t.menu.submit}</DropdownItem>}
        {course.status === "published" && <DropdownItem onSelect={onUnpublish}><EyeOffIcon className="size-4" /> {t.menu.unpublish}</DropdownItem>}
        <DropdownSeparator />
        <DropdownItem danger onSelect={onDelete}><TrashIcon className="size-4" /> {t.menu.delete}</DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}

function Rating({ course }: { course: Course }) {
  const v = course.reviews_avg_rating ?? course.avg_rating;
  if (v == null || !course.reviews_count) return <span className="text-muted">-</span>;
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <StarIcon className="size-3.5 text-warning" aria-hidden /> {v.toFixed(1)}
    </span>
  );
}

/** Optimistic list mutation: patch/remove a course in every cached list, roll back on failure. */
function useCourseMutation(opts: { fn: (c: Course) => Promise<unknown>; apply: (l: CourseListResponse, c: Course) => CourseListResponse; ok: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: opts.fn,
    onMutate: async (c: Course) => {
      await qc.cancelQueries({ queryKey: qk.myCoursesAll });
      const snap = qc.getQueriesData<CourseListResponse>({ queryKey: qk.myCoursesAll });
      qc.setQueriesData<CourseListResponse>({ queryKey: qk.myCoursesAll }, (l) => (l ? opts.apply(l, c) : l));
      return { snap };
    },
    onError: (e, _c, ctx) => {
      ctx?.snap.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(isApiError(e) ? e.message : m.common.loadError);
    },
    onSuccess: () => toast.success(opts.ok),
    onSettled: () => void qc.invalidateQueries({ queryKey: ["studio"] }),
  });
}

export function CoursesListPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<Course | null>(null);
  const search = useDebounced(q.trim());

  const params: MyCoursesParams = { page, per_page: PER_PAGE, sort, status: status || undefined, search: search || undefined };
  const list = useMyCourses(params);

  const setStatusLocal = (s: CourseStatus) => (l: CourseListResponse, c: Course): CourseListResponse => ({ ...l, data: l.data.map((x) => (x.id === c.id ? { ...x, status: s } : x)) });

  const del = useCourseMutation({
    fn: (c) => api.delete(`/courses/${c.id}`),
    apply: (l, c) => ({ ...l, data: l.data.filter((x) => x.id !== c.id), meta: { ...l.meta, total: Math.max(0, l.meta.total - 1) } }),
    ok: t.deleted,
  });
  const submit = useCourseMutation({ fn: (c) => api.post(`/courses/${c.id}/publish`), apply: setStatusLocal("pending_review"), ok: t.submitted });
  const unpublish = useCourseMutation({ fn: (c) => api.put(`/courses/${c.id}`, { status: "draft" }), apply: setStatusLocal("draft"), ok: t.unpublished });

  const rows = list.data?.data ?? [];
  const filtered = !!(search || status);

  return (
    <>
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          <Link href="/studio/courses/new" className={buttonStyles()}>
            <PlusIcon className="size-4" aria-hidden /> {t.create}
          </Link>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-48 flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchPlaceholder}
              className="pl-9"
            />
          </div>
          <div className="w-full sm:w-44">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label={t.statusAll}>
              <option value="">{t.statusAll}</option>
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{m.status[s]}</option>)}
            </Select>
          </div>
          <div className="w-full sm:w-44">
            <Select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} aria-label="Sắp xếp">
              {Object.entries(t.sort).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>
        </div>

        {list.isPending ? (
          <div className="divide-y divide-(--table-divider) border-t border-border" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-12 w-20 shrink-0" />
                <div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-2/5" /><Skeleton className="h-3 w-1/4" /></div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        ) : list.isError ? (
          <div className="border-t border-border"><LoadError onRetry={() => void list.refetch()} /></div>
        ) : rows.length === 0 ? (
          <div className="border-t border-border">
            <EmptyState
              icon={<BookIcon />}
              title={filtered ? t.emptyFiltered : t.emptyTitle}
              description={filtered ? m.common.noResults : t.emptyText}
              action={!filtered ? <Link href="/studio/courses/new" className={buttonStyles()}><PlusIcon className="size-4" aria-hidden /> {t.create}</Link> : undefined}
            />
          </div>
        ) : (
          <div className={list.isFetching ? "opacity-70 transition-opacity" : "transition-opacity"}>
            <div className="hidden border-t border-b border-(--table-divider) bg-(--table-header-bg) px-4 py-2.5 text-xs font-semibold tracking-wide text-(color:--table-header-fg) uppercase md:grid md:grid-cols-[minmax(0,1fr)_7rem_5.5rem_5.5rem_4.5rem_7rem_2rem] md:gap-4">
              <span>{t.cols.course}</span><span>{t.cols.status}</span><span className="text-right">{t.cols.students}</span><span className="text-right">{t.cols.lessons}</span><span>{t.cols.rating}</span><span>{t.cols.updated}</span><span />
            </div>
            <ul className="divide-y divide-(--table-divider) border-t border-border md:border-t-0">
              {rows.map((c) => (
                <li key={c.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-(--table-row-hover) md:grid-cols-[minmax(0,1fr)_7rem_5.5rem_5.5rem_4.5rem_7rem_2rem]">
                  <Link href={`/studio/courses/${c.id}`} className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1">
                    <Thumb src={c.thumbnail} className="h-12 w-20" rounded="rounded-md" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{c.title}</span>
                      <span className="block truncate text-sm text-muted">{c.category?.name ?? "Chưa có danh mục"}</span>
                      <span className="mt-1 flex items-center gap-2 text-xs text-muted md:hidden">
                        <StatusBadge status={c.status} />
                        <span>{fmtNumber(c.enrollments_count ?? 0)} học viên</span>
                        <span>{fmtNumber(c.lessons_count ?? 0)} bài</span>
                      </span>
                    </span>
                  </Link>
                  <span className="hidden md:block"><StatusBadge status={c.status} /></span>
                  <span className="hidden text-right tabular-nums md:block">{fmtNumber(c.enrollments_count ?? 0)}</span>
                  <span className="hidden text-right tabular-nums md:block">{fmtNumber(c.lessons_count ?? 0)}</span>
                  <span className="hidden md:block"><Rating course={c} /></span>
                  <span className="hidden text-sm text-muted md:block">{fmtRelative(c.updated_at)}</span>
                  <RowMenu course={c} onDelete={() => setToDelete(c)} onSubmit={() => submit.mutate(c)} onUnpublish={() => unpublish.mutate(c)} />
                </li>
              ))}
            </ul>
          </div>
        )}
        <Pagination meta={list.data?.meta} onPageChange={setPage} disabled={list.isFetching} />
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        destructive
        title={t.deleteTitle}
        description={toDelete ? t.deleteText(toDelete.title) : undefined}
        confirmLabel={m.common.delete}
        onConfirm={() => {
          if (toDelete) del.mutate(toDelete);
          setToDelete(null);
        }}
      />
    </>
  );
}
