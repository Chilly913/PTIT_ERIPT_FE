"use client";

import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, CardContent, CardHeader, PageHeader, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { messages } from "@/lib/messages";
import { BarList } from "./bar-list";
import { chartColors } from "./chart-colors";
import { fmtNumber, fmtPercent, fmtTime } from "./format";
import { KpiCard } from "./kpi-card";
import { PendingCoursesCard, RecentUsersCard } from "./lists";
import { dashboardMessages as t } from "./messages";
import { TimeSeriesChart } from "./time-series-chart";
import type { AdminStats } from "./types";
import { BookIcon, ClipboardIcon, LogoIcon, RefreshIcon, UserCheckIcon, UserPlusIcon, UsersIcon } from "@/components/icons";

const page = messages.admin.pages.dashboard;

const STATUS_COLOR: Record<string, string> = {
  draft: chartColors.info,
  pending_review: chartColors.warning,
  published: chartColors.success,
  rejected: chartColors.danger,
  closed: chartColors.neutral,
};

export function DashboardPage() {
  const q = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.get<AdminStats>("/admin/stats"),
    staleTime: 30_000,
  });

  const refresh = (
    <>
      {q.dataUpdatedAt > 0 && (
        <span className="text-sm text-muted" aria-live="polite">
          {t.updatedAt(fmtTime(new Date(q.dataUpdatedAt)))}
        </span>
      )}
      <Button variant="outline" onClick={() => q.refetch()} loading={q.isFetching} aria-label={q.isFetching ? t.refreshing : t.refresh}>
        {!q.isFetching && <RefreshIcon aria-hidden className="size-4" />}
        {t.refresh}
      </Button>
    </>
  );

  return (
    <>
      <PageHeader title={page.title} description={page.description} actions={refresh} />
      {q.isPending ? (
        <DashboardSkeleton />
      ) : q.isError && !q.data ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Alert tone="danger" className="w-full max-w-md text-left" title={t.loadError}>
              {q.error.message}
            </Alert>
            <Button onClick={() => q.refetch()} loading={q.isFetching}>
              {t.retry}
            </Button>
          </CardContent>
        </Card>
      ) : q.data ? (
        <div className="space-y-6">
          {q.isError && <Alert tone="warning">{t.refreshError}</Alert>}
          <Content s={q.data} />
        </div>
      ) : null}
    </>
  );
}

function Content({ s }: { s: AdminStats }) {
  const published = s.courses.by_status.find((x) => x.status === "published")?.count ?? 0;
  const pending = s.courses.by_status.find((x) => x.status === "pending_review")?.count ?? 0;
  return (
    <>
      <section aria-label={t.kpiLabel} className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard icon={<UsersIcon />} label={t.kpi.usersTotal} value={s.users.total} sub={t.kpi.usersTotalSub(s.users.disabled, s.users.unverified)} />
        <KpiCard icon={<UserCheckIcon />} label={t.kpi.usersActive} value={s.users.active} sub={t.kpi.usersActiveSub(fmtPercent(s.users.active, s.users.total))} />
        <KpiCard icon={<UserPlusIcon />} label={t.kpi.usersNew} value={s.users.new_7d} sub={t.kpi.usersNewSub(fmtNumber(s.users.new_30d))} />
        <KpiCard icon={<BookIcon />} label={t.kpi.courses} value={s.courses.total} sub={t.kpi.coursesSub(fmtNumber(published), fmtNumber(pending))} />
        <KpiCard
          icon={<LogoIcon />}
          label={t.kpi.enrollments}
          value={s.enrollments.total}
          sub={t.kpi.enrollmentsSub(fmtNumber(s.enrollments.new_7d), fmtNumber(s.enrollments.new_30d))}
        />
        <KpiCard
          icon={<ClipboardIcon />}
          label={t.kpi.exams}
          value={s.exams.total}
          sub={t.kpi.examsSub(fmtNumber(s.exams.active), fmtNumber(s.exams.attempts_30d))}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TimeSeriesChart
          title={t.signups.title}
          description={t.signups.description}
          seriesName={t.signups.series}
          data={s.series.signups_30d}
          kind="line"
          color={chartColors.series1}
        />
        <TimeSeriesChart
          title={t.enrollments.title}
          description={t.enrollments.description}
          seriesName={t.enrollments.series}
          data={s.series.enrollments_30d}
          kind="bar"
          color={chartColors.series2}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <BarList
          title={t.roles.title}
          description={t.roles.description}
          emptyText={t.roles.empty}
          items={s.users.by_role.map((r) => ({ key: r.role, label: t.roles.names[r.role] ?? r.role, value: r.count, color: chartColors.series1 }))}
        />
        <BarList
          title={t.courseStatus.title}
          description={t.courseStatus.description}
          emptyText={t.courseStatus.empty}
          items={s.courses.by_status.map((r) => ({
            key: r.status,
            label: t.courseStatus.names[r.status] ?? r.status,
            value: r.count,
            color: STATUS_COLOR[r.status] ?? chartColors.neutral,
          }))}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <PendingCoursesCard courses={s.pending_courses} />
        <RecentUsersCard users={s.recent_users} />
      </section>
    </>
  );
}

function ChartCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="mb-2 h-8 w-24" />
        <Skeleton className="h-56 w-full" />
      </CardContent>
    </Card>
  );
}

function BarsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2.5 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </CardHeader>
      <div className="divide-y divide-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label={messages.common.loading}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="space-y-3 p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-full" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <BarsSkeleton />
        <BarsSkeleton />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ListSkeleton />
        <ListSkeleton />
      </div>
    </div>
  );
}
