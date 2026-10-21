"use client";

import Link from "next/link";
import { useMemo } from "react";
import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { BookIcon, ClipboardCheckIcon, MessageIcon, PlusIcon, RefreshIcon, UsersIcon, CheckCircleIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { Alert } from "@/components/ui/alert";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/components/providers/session-provider";
import { api } from "@/lib/api";
import type { Paginated } from "@/lib/types";
import { BarList } from "@/features/dashboard/bar-list";
import { chartColors } from "@/features/dashboard/chart-colors";
import { TimeSeriesChart } from "@/features/dashboard/time-series-chart";
import type { DayCount } from "@/features/dashboard/types";
import { qk } from "@/features/courses/api";
import { courseMessages as cm } from "@/features/courses/messages";
import { StatusBadge, Thumb } from "@/features/courses/parts";
import type { Course, CourseListResponse, CourseStatus, Qa, SubmissionsResponse } from "@/features/courses/types";
import { fmtNumber, fmtRelative, STATUS_ORDER } from "@/features/courses/utils";
import { studioMessages } from "./messages";

const t = studioMessages.overview;

interface StatsPayload {
  courses: { total: number; by_status: Array<{ status: string; count: number }> };
  students: number;
  total_enrollments: number;
  completed_enrollments: number;
  completion_rate: number;
  new_enrollments_30d: DayCount[];
  new_enrollments_30d_total: number;
  top_courses: Array<{ id: number; title: string; slug: string; thumbnail: string | null; students: number; completed_students: number; completion_rate: number }>;
}
interface DashboardPayload {
  stats: StatsPayload;
  recent_enrollments: Array<{ id: number; user: { id: number; name: string; email: string; avatar: string | null }; course: { id: number; title: string; slug: string }; source: string; enrolled_at: string }>;
  pending_submissions: number;
  unanswered_questions: number;
}

const STATUS_COLOR: Record<string, string> = {
  draft: chartColors.info,
  pending_review: chartColors.warning,
  published: chartColors.success,
  rejected: chartColors.danger,
  closed: chartColors.neutral,
};

function emptyDays(): DayCount[] {
  const out: DayCount[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    out.push({ date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, count: 0 });
  }
  return out;
}

/** Dashboard endpoint when deployed; otherwise a summary computed from the caller's own course list. */
function useOverviewData() {
  return useQuery({
    queryKey: qk.dashboard,
    queryFn: async () => {
      try {
        return { source: "api" as const, data: await api.get<DashboardPayload>("/instructor/dashboard") };
      } catch {
        const list = await api.get<CourseListResponse>("/my-courses", { query: { per_page: 100 } });
        const byStatus = new Map<string, number>();
        for (const c of list.data) byStatus.set(c.status, (byStatus.get(c.status) ?? 0) + 1);
        const students = list.data.reduce((n, c) => n + (c.enrollments_count ?? 0), 0);
        const stats: StatsPayload = {
          courses: { total: list.meta.total, by_status: STATUS_ORDER.map((s) => ({ status: s, count: byStatus.get(s) ?? 0 })) },
          students,
          total_enrollments: students,
          completed_enrollments: 0,
          completion_rate: 0,
          new_enrollments_30d: emptyDays(),
          new_enrollments_30d_total: 0,
          top_courses: [...list.data].sort((a, b) => (b.enrollments_count ?? 0) - (a.enrollments_count ?? 0)).slice(0, 5).map((c) => ({ id: c.id, title: c.title, slug: c.slug, thumbnail: c.thumbnail, students: c.enrollments_count ?? 0, completed_students: 0, completion_rate: 0 })),
        };
        return { source: "fallback" as const, data: { stats, recent_enrollments: [], pending_submissions: 0, unanswered_questions: 0 } as DashboardPayload };
      }
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

function Kpi({ label, value, sub, icon, href }: { label: string; value: string; sub: string; icon: React.ReactNode; href?: string }) {
  const body = (
    <Card className={href ? "p-4 transition-colors hover:bg-surface-subtle" : "p-4"}>
      <div className="flex items-center justify-between gap-2 text-muted">
        <p className="text-sm font-medium">{label}</p>
        <span aria-hidden className="[&_svg]:size-4">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </Card>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

export function OverviewSkeleton() {
  return (
    <div aria-hidden>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div><Skeleton className="h-7 w-56" /><Skeleton className="mt-2 h-4 w-72" /></div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <Card key={i} className="p-4"><Skeleton className="h-4 w-24" /><Skeleton className="mt-3 h-8 w-16" /><Skeleton className="mt-2 h-3 w-32" /></Card>)}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardHeader><Skeleton className="h-5 w-40" /></CardHeader><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
        <Card><CardHeader><Skeleton className="h-5 w-40" /></CardHeader><CardContent className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</CardContent></Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardHeader><Skeleton className="h-5 w-40" /></CardHeader><CardContent className="space-y-3">{Array.from({ length: 4 }).map((__, j) => <Skeleton key={j} className="h-9 w-full" />)}</CardContent></Card>)}
      </div>
    </div>
  );
}

/** Per-course inboxes (pending submissions, unanswered questions) for the lists. Only the first courses are queried. */
function useInboxes(courses: Course[]) {
  const published = courses.filter((c) => c.status === "published" || (c.enrollments_count ?? 0) > 0).slice(0, 6);
  const subs = useQueries({
    queries: published.map((c) => ({
      queryKey: qk.submissions(c.id),
      queryFn: () => api.get<SubmissionsResponse>(`/courses/${c.id}/assignments/submissions`),
      staleTime: 30_000,
      retry: false,
    })),
  });
  const qas = useQueries({
    queries: published.map((c) => ({
      queryKey: qk.qas(c.id, 1),
      queryFn: () => api.get<Paginated<Qa>>(`/courses/${c.id}/qas`, { query: { page: 1 } }),
      staleTime: 30_000,
      retry: false,
    })),
  });
  const pending = published
    .map((c, i) => ({ course: c, ungraded: subs[i].data?.summary?.ungraded ?? 0 }))
    .filter((x) => x.ungraded > 0);
  const unanswered = published
    .map((c, i) => ({ course: c, open: (qas[i].data?.data ?? []).filter((q) => !(q.replies ?? []).some((r) => r.user_id === c.user_id)) }))
    .filter((x) => x.open.length > 0);
  return { pending, unanswered };
}

function ListCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle>{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="flex-1 p-0">{children}</CardContent>
    </Card>
  );
}

export function StudioOverview() {
  const { user } = useSession();
  const q = useOverviewData();
  const courses = useQuery({
    queryKey: qk.myCourses({ per_page: 100 }),
    queryFn: () => api.get<CourseListResponse>("/my-courses", { query: { per_page: 100 } }),
    staleTime: 60_000,
  });
  const inboxes = useInboxes(courses.data?.data ?? []);

  const view = q.data;
  const stats = view?.data.stats;
  const statusItems = useMemo(
    () => STATUS_ORDER.map((s) => ({ key: s, label: cm.status[s as CourseStatus], value: stats?.courses.by_status.find((x) => x.status === s)?.count ?? 0, color: STATUS_COLOR[s] })),
    [stats],
  );

  if (q.isPending) return <OverviewSkeleton />;
  if (q.isError || !view || !stats) {
    return (
      <>
        <PageHeader title={t.title} description={t.description} />
        <Card><EmptyState icon={<RefreshIcon />} title={cm.common.loadError} action={<Button variant="outline" onClick={() => void q.refetch()}>{cm.common.retry}</Button>} /></Card>
      </>
    );
  }

  const fallback = view.source === "fallback";
  const published = stats.courses.by_status.find((s) => s.status === "published")?.count ?? 0;
  const drafts = stats.courses.by_status.find((s) => s.status === "draft")?.count ?? 0;
  const pendingCount = fallback ? inboxes.pending.reduce((n, x) => n + x.ungraded, 0) : view.data.pending_submissions;
  const unansweredCount = fallback ? inboxes.unanswered.reduce((n, x) => n + x.open.length, 0) : view.data.unanswered_questions;

  return (
    <>
      <PageHeader
        title={t.greeting(user.name)}
        description={t.description}
        actions={
          <>
            <Button variant="outline" onClick={() => void q.refetch()} loading={q.isFetching} aria-label={t.refresh}>
              {!q.isFetching && <RefreshIcon className="size-4" aria-hidden />} {t.refresh}
            </Button>
            <Link href="/studio/courses/new" className={buttonStyles()}><PlusIcon className="size-4" aria-hidden /> {t.createCourse}</Link>
          </>
        }
      />
      {fallback && <Alert tone="info" className="mb-4">{t.partial}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label={t.kpi.courses} value={fmtNumber(stats.courses.total)} sub={t.kpi.coursesSub(published, drafts)} icon={<BookIcon />} href="/studio/courses" />
        <Kpi label={t.kpi.students} value={fmtNumber(stats.students)} sub={t.kpi.studentsSub} icon={<UsersIcon />} href="/studio/students" />
        <Kpi label={t.kpi.completion} value={fallback ? "-" : `${stats.completion_rate}%`} sub={t.kpi.completionSub} icon={<CheckCircleIcon />} />
        <Kpi label={t.kpi.pending} value={fmtNumber(pendingCount)} sub={t.kpi.pendingSub} icon={<ClipboardCheckIcon />} />
        <Kpi label={t.kpi.unanswered} value={fmtNumber(unansweredCount)} sub={t.kpi.unansweredSub} icon={<MessageIcon />} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TimeSeriesChart title={t.chartTitle} description={t.chartDesc} seriesName={t.chartSeries} data={stats.new_enrollments_30d} kind="bar" color={chartColors.series1} />
        </div>
        <BarList title={t.byStatus} description={t.byStatusDesc} items={statusItems} emptyText={t.statusEmpty} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <ListCard title={t.recent}>
          {view.data.recent_enrollments.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">{t.recentEmpty}</p>
          ) : (
            <ul className="divide-y divide-border">
              {view.data.recent_enrollments.slice(0, 6).map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-5 py-2.5">
                  <Avatar name={e.user.name} src={e.user.avatar} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{e.user.name}</p>
                    <p className="truncate text-sm text-muted">{t.enrolledIn(e.course.title)}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted">{fmtRelative(e.enrolled_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </ListCard>

        <ListCard title={t.pendingList}>
          {inboxes.pending.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">{t.pendingEmpty}</p>
          ) : (
            <ul className="divide-y divide-border">
              {inboxes.pending.map((x) => (
                <li key={x.course.id} className="flex items-center gap-3 px-5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{x.course.title}</p>
                    <p className="text-sm text-muted">{t.pendingCount(x.ungraded)}</p>
                  </div>
                  <Link href={`/studio/courses/${x.course.id}/assignments`} className={buttonStyles({ variant: "outline", size: "sm" })}>{t.gradeNow}</Link>
                </li>
              ))}
            </ul>
          )}
        </ListCard>

        <ListCard title={t.qaList}>
          {inboxes.unanswered.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">{t.qaEmpty}</p>
          ) : (
            <ul className="divide-y divide-border">
              {inboxes.unanswered.map((x) => (
                <li key={x.course.id} className="flex items-center gap-3 px-5 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{x.course.title}</p>
                    <p className="truncate text-sm text-muted">{t.qaCount(x.open.length)} · {x.open[0].subject}</p>
                  </div>
                  <Link href={`/studio/courses/${x.course.id}?tab=feedback`} className={buttonStyles({ variant: "outline", size: "sm" })}>{t.answerNow}</Link>
                </li>
              ))}
            </ul>
          )}
        </ListCard>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>{t.myCourses}</CardTitle>
            <CardDescription>{cm.list.description}</CardDescription>
          </div>
          <Link href="/studio/courses" className={buttonStyles({ variant: "ghost", size: "sm" })}>{t.viewAll}</Link>
        </CardHeader>
        <CardContent className="p-0">
          {(courses.data?.data.length ?? 0) === 0 ? (
            <EmptyState icon={<BookIcon />} title={t.noCourses} description={t.noCoursesText} action={<Link href="/studio/courses/new" className={buttonStyles()}><PlusIcon className="size-4" aria-hidden /> {t.createCourse}</Link>} />
          ) : (
            <ul className="divide-y divide-border">
              {courses.data!.data.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link href={`/studio/courses/${c.id}`} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-surface-subtle">
                    <Thumb src={c.thumbnail} className="h-10 w-16" rounded="rounded-md" />
                    <span className="min-w-0 flex-1 truncate font-medium">{c.title}</span>
                    <StatusBadge status={c.status} />
                    <span className="hidden w-24 text-right text-sm text-muted tabular-nums sm:block">{fmtNumber(c.enrollments_count ?? 0)} học viên</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
