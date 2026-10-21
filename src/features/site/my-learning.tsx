"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { isApiError } from "@/lib/errors";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseThumb } from "@/components/site/course-thumb";
import { QueryError } from "@/components/site/query-state";
import { BookIcon, CalendarIcon, ClipboardIcon, StarIcon } from "@/components/icons";
import { AwardIcon, PlayIcon } from "@/components/icons/icons-learn";
import { formatDate, formatDateTime } from "./format";
import { siteMessages as t } from "./messages";
import type { EnrollmentItem } from "./types";

interface Dashboard {
  courses?: { id: number; slug: string; last_activity_at: string | null }[];
  continue_learning?: { course: { id: number; title: string; slug?: string }; lesson_id: number; lesson_title: string; progress_percent: number } | null;
  upcoming_exams?: { id: number; title: string; starts_at: string | null; window: string; course: { title: string } | null }[];
  pending_assignments?: { assignment_id: number; lesson_id: number; lesson_title: string; course: { id: number; title: string; slug?: string }; due_at: string | null; overdue: boolean }[];
  recent_certificates?: { id: number; credential_id: string; course: { title: string } | null; issued_at: string }[];
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label={label} className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
      <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${value}%` }} />
    </div>
  );
}

function CertificateAction({ slug, credential }: { slug: string; credential: string | null }) {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const claim = useMutation({
    mutationFn: () => api.post<{ certificate: { credential_id: string } }>(`/courses/${slug}/certificate`),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ["site"] });
      router.push(`/certificates/${r.certificate.credential_id}`);
    },
    onError: (err) => toast.error(isApiError(err) ? err.message : "Không nhận được chứng chỉ."),
  });
  // sits above the card's full-size link overlay
  const cls = buttonStyles({ variant: "primary", size: "sm", className: "relative z-10 w-full" });
  return credential ? (
    <Link href={`/certificates/${credential}`} className={cls}><AwardIcon size={14} /> {t.my.viewCertificate}</Link>
  ) : (
    <button type="button" className={cls} disabled={claim.isPending} onClick={() => claim.mutate()}><AwardIcon size={14} /> {t.my.claimCertificate}</button>
  );
}

function EnrolledCard({ e, slug }: { e: EnrollmentItem; slug?: string }) {
  const c = e.course;
  if (!c) return null;
  const pct = Math.round(Number(e.progress) || 0);
  const done = e.lessons_count > 0 && e.completed_lessons >= e.lessons_count;
  const key = slug ?? String(c.id);
  const href = e.is_planned ? `/courses/${c.id}` : `/learn/${key}`;
  return (
    <article className="relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors focus-within:border-primary hover:border-border-strong">
      <CourseThumb id={c.id} title={c.title} src={c.thumbnail} />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex min-h-5 items-center gap-1.5 text-xs text-muted">
          {c.category && <span className="truncate">{c.category.name}</span>}
          {e.is_planned && <Badge tone="info">{t.my.planned}</Badge>}
          {done && <Badge tone="success">{t.my.completed}</Badge>}
        </div>
        <h3 className="line-clamp-2 min-h-[2.75rem] text-base font-semibold leading-snug">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">{c.title}</Link>
        </h3>
        {c.instructor && <p className="truncate text-sm text-muted">{c.instructor.name}</p>}
        <div className="mt-auto space-y-1.5 pt-2">
          <ProgressBar value={pct} label={c.title} />
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{t.my.progress(e.completed_lessons, e.lessons_count)}</span>
            <span className="font-semibold text-foreground">{t.my.percent(pct)}</span>
          </div>
        </div>
        <span className={buttonStyles({ variant: done ? "outline" : "primary", size: "sm", className: "mt-2 w-full" })} aria-hidden>
          {e.is_planned ? t.my.planYour : done ? t.my.review : pct > 0 ? t.my.continue : t.my.start}
        </span>
        {done && e.certificate_enabled && <CertificateAction slug={key} credential={e.certificate_credential ?? null} />}
      </div>
    </article>
  );
}

function Widget({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface">
      <h2 className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold"><span className="text-muted">{icon}</span>{title}</h2>
      <div className="p-4">{children}</div>
    </section>
  );
}

function WidgetsSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
    </div>
  );
}

function Widgets({ dash, points }: { dash: Dashboard | undefined; points: { balance: number; streak_days: number } | undefined }) {
  const none = <p className="text-sm text-muted">{t.my.widgets.none}</p>;
  return (
    <div className="space-y-4">
      {points && (
        <Widget icon={<StarIcon size={16} />} title={t.my.widgets.points}>
          <p className="text-3xl font-extrabold">{points.balance.toLocaleString("vi-VN")} <span className="text-sm font-medium text-muted">{t.my.widgets.pointsUnit}</span></p>
          {points.streak_days > 0 && <p className="mt-1 text-sm text-muted">Chuỗi {points.streak_days} ngày đăng nhập</p>}
        </Widget>
      )}
      <Widget icon={<ClipboardIcon size={16} />} title={t.my.widgets.tasks}>
        {dash?.pending_assignments?.length ? (
          <ul className="space-y-2.5">
            {dash.pending_assignments.slice(0, 5).map((a) => (
              <li key={a.assignment_id}>
                <Link href={`/learn/${a.course.slug ?? a.course.id}/${a.lesson_id}`} className="block rounded-lg hover:bg-surface-muted">
                  <span className="block truncate text-sm font-medium">{a.lesson_title}</span>
                  <span className="block truncate text-xs text-muted">{a.course.title}</span>
                  {a.due_at && <span className={cn("block text-xs", a.overdue ? "text-danger" : "text-muted")}>{a.overdue ? "Quá hạn " : "Hạn "}{formatDate(a.due_at)}</span>}
                </Link>
              </li>
            ))}
          </ul>
        ) : none}
      </Widget>
      <Widget icon={<CalendarIcon size={16} />} title={t.my.widgets.exams}>
        {dash?.upcoming_exams?.length ? (
          <ul className="space-y-2.5">
            {dash.upcoming_exams.slice(0, 4).map((x) => (
              <li key={x.id}>
                <Link href={`/exams/${x.id}`} className="block rounded-md hover:bg-surface-muted">
                  <p className="truncate text-sm font-medium">{x.title}</p>
                  <p className="truncate text-xs text-muted">{x.course?.title ? `${x.course.title} · ` : ""}{t.my.window[x.window] ?? x.window}{x.starts_at ? ` · ${formatDateTime(x.starts_at)}` : ""}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : none}
      </Widget>
      <Widget icon={<CalendarIcon size={16} />} title={t.my.widgets.checkin}>
        <Link href="/check-in" className="text-sm font-medium text-primary underline underline-offset-2">{t.my.widgets.checkinLink}</Link>
      </Widget>
      <Widget icon={<AwardIcon size={16} />} title={t.my.widgets.certificates}>
        {dash?.recent_certificates?.length ? (
          <ul className="space-y-2.5">
            {dash.recent_certificates.slice(0, 4).map((c) => (
              <li key={c.id}>
                <Link href={`/certificates/${c.credential_id}`} className="block rounded-lg hover:bg-surface-muted">
                  <span className="block truncate text-sm font-medium">{c.course?.title ?? "Chứng nhận"}</span>
                  <span className="block truncate text-xs text-muted">{c.credential_id} · {formatDate(c.issued_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : none}
      </Widget>
    </div>
  );
}

type Tab = "all" | "progress" | "done";

export function MyLearning({ name }: { name: string }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");

  const enrollments = useQuery({
    queryKey: ["site", "enrollments"],
    queryFn: () => api.get<EnrollmentItem[]>("/enrollments"),
    staleTime: 30_000,
  });
  const dash = useQuery({
    queryKey: ["site", "dashboard"],
    queryFn: () => api.get<Dashboard>("/me/dashboard"),
    retry: false,
    staleTime: 60_000,
  });
  const points = useQuery({
    queryKey: ["site", "points"],
    queryFn: () => api.get<{ balance: number; streak_days: number }>("/points/summary"),
    retry: false,
    staleTime: 60_000,
  });

  const slugById = useMemo(() => new Map((dash.data?.courses ?? []).map((c) => [c.id, c.slug])), [dash.data]);
  const lastById = useMemo(() => new Map((dash.data?.courses ?? []).map((c) => [c.id, c.last_activity_at])), [dash.data]);

  const list = useMemo(() => {
    const items = (enrollments.data ?? []).filter((e) => e.course);
    const sorted = [...items].sort((a, b) => {
      const la = lastById.get(a.course_id) ?? a.enrolled_at;
      const lb = lastById.get(b.course_id) ?? b.enrolled_at;
      return String(lb).localeCompare(String(la));
    });
    const isDone = (e: EnrollmentItem) => e.lessons_count > 0 && e.completed_lessons >= e.lessons_count;
    if (tab === "progress") return sorted.filter((e) => !isDone(e) && !e.is_planned);
    if (tab === "done") return sorted.filter(isDone);
    return sorted;
  }, [enrollments.data, tab, lastById]);

  const cont = dash.data?.continue_learning;
  const dashMissing = dash.isError && isApiError(dash.error) && dash.error.status === 404;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-3xl font-bold">{t.my.hello(name)}</h1>
        <p className="mt-1 text-muted">{t.my.subtitle}</p>
      </header>

      {cont && (
        <Link
          href={`/learn/${cont.course.slug ?? cont.course.id}/${cont.lesson_id}`}
          className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong sm:flex-row sm:items-center"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><PlayIcon size={18} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold tracking-wide text-primary uppercase">{t.my.continue}</span>
            <span className="block truncate font-semibold">{cont.lesson_title}</span>
            <span className="block truncate text-sm text-muted">{cont.course.title}</span>
          </span>
          <span className={buttonStyles({ size: "md" })} aria-hidden>{t.my.continue}</span>
        </Link>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <section aria-labelledby="my-courses-h" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="my-courses-h" className="text-xl font-bold">{t.my.title}</h2>
            <div role="group" aria-label={t.my.title} className="inline-flex rounded-lg border border-border bg-surface p-0.5">
              {([["all", t.my.all], ["progress", t.my.inProgress], ["done", t.my.completed]] as [Tab, string][]).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={tab === k}
                  onClick={() => setTab(k)}
                  className={cn("rounded-md px-3 py-1 text-sm transition-colors", tab === k ? "bg-primary-soft font-semibold text-primary-soft-foreground" : "text-muted hover:text-foreground")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            {enrollments.isPending ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="overflow-hidden rounded-xl border border-border bg-surface">
                    <Skeleton className="aspect-video w-full rounded-none" />
                    <div className="space-y-2 p-4"><Skeleton className="h-5 w-20" /><Skeleton className="h-11 w-full" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-2 w-full" /><Skeleton className="h-8 w-full" /></div>
                  </div>
                ))}
              </div>
            ) : enrollments.isError ? (
              <QueryError error={enrollments.error} onRetry={() => qc.invalidateQueries({ queryKey: ["site", "enrollments"] })} loginNext="/my" />
            ) : list.length === 0 ? (
              <EmptyState
                icon={<BookIcon />}
                title={tab === "all" ? t.my.emptyTitle : t.my.widgets.none}
                description={tab === "all" ? t.my.emptyText : undefined}
                action={<Link href="/courses" className={buttonStyles()}>{t.my.emptyAction}</Link>}
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((e) => <EnrolledCard key={e.id} e={e} slug={slugById.get(e.course_id)} />)}
              </div>
            )}
          </div>
        </section>

        <aside aria-label="Tổng quan">
          {dash.isPending ? <WidgetsSkeleton /> : dashMissing || dash.isError ? (
            <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">{t.my.widgets.unavailable}</p>
          ) : (
            <Widgets dash={dash.data} points={points.data} />
          )}
        </aside>
      </div>
    </div>
  );
}
