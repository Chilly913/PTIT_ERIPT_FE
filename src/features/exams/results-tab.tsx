"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { DownloadIcon, SearchIcon, BarChartIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { chartColors } from "@/features/dashboard/chart-colors";
import { LoadError } from "@/features/courses/parts";
import { useDebounced } from "@/features/studio/common";
import { examMessages as m } from "./messages";
import type { ExamDetail, ResultsResponse } from "./types";

const t = m.results;
const fmt = (n: number | null | undefined, d = 1) => (n == null ? "-" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: d }).format(n));

export function ResultsTab({ exam }: { exam: ExamDetail }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q.trim());
  const res = useQuery({
    queryKey: ["studio", "exam-results", String(exam.id), dq, page],
    queryFn: () => api.get<ResultsResponse>(`/exams/${exam.id}/results`, { query: { q: dq || undefined, page, per_page: 15 } }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  if (res.isPending) return <div aria-hidden className="space-y-4"><div className="grid gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div><Skeleton className="h-56 w-full" /></div>;
  if (res.isError || !res.data) return <LoadError onRetry={() => void res.refetch()} />;
  const s = res.data.summary;
  const max = Math.max(1, ...s.distribution.map((d) => d.count));
  const kpi: Array<[string, string]> = [[t.candidates, fmt(s.candidates, 0)], [t.attempted, fmt(s.attempted, 0)], [t.average, fmt(s.average_score)], [t.passRate, s.pass_rate == null ? "-" : `${fmt(s.pass_rate)}%`]];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpi.map(([l, v]) => <div key={l} className="rounded-xl border border-border bg-surface p-4"><p className="text-sm font-medium text-muted">{l}</p><p className="mt-1.5 text-2xl font-bold tabular-nums">{v}</p></div>)}
      </div>
      <section className="rounded-xl border border-border bg-surface p-5">
        <h3 className="mb-3 font-semibold">{t.distribution}</h3>
        <div className="flex h-32 items-end gap-1.5" role="img" aria-label={t.distribution}>
          {s.distribution.map((d) => (
            <div key={d.from} className="flex flex-1 flex-col items-center justify-end gap-1">
              <span className="text-xs tabular-nums text-muted">{d.count || ""}</span>
              <div className="w-full rounded-t-sm" style={{ height: `${(d.count / max) * 80}%`, minHeight: d.count ? 4 : 0, background: chartColors.series1 }} />
              <span className="text-[0.7rem] text-muted tabular-nums">{d.from}</span>
            </div>
          ))}
        </div>
      </section>
      <div className="rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="relative min-w-48 max-w-md flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={t.search} aria-label={t.search} className="pl-9" />
          </div>
          <a href={`/bff/exams/${exam.id}/results/export${dq ? `?q=${encodeURIComponent(dq)}` : ""}`} download className="inline-flex h-9 items-center gap-2 rounded-lg border border-(--btn-outline-border) bg-(--btn-outline-bg) px-4 font-medium text-(color:--btn-outline-fg) transition-colors hover:bg-(--btn-outline-hover)"><DownloadIcon className="size-4" aria-hidden /> {t.export}</a>
        </div>
        {res.data.data.length === 0 ? (
          <div className="border-t border-border"><EmptyState icon={<BarChartIcon />} title={t.empty} /></div>
        ) : (
          <div className={`overflow-x-auto border-t border-border transition-opacity ${res.isFetching ? "opacity-70" : ""}`}>
            <table className="w-full min-w-[40rem] text-left">
              <thead className="border-b border-(--table-divider) bg-(--table-header-bg) text-xs font-semibold tracking-wide text-(color:--table-header-fg) uppercase">
                <tr><th className="px-4 py-2.5">{t.cols.name}</th><th className="px-3 py-2.5 text-right">{t.cols.attempts}</th><th className="px-3 py-2.5 text-right">{t.cols.best}</th><th className="px-3 py-2.5 text-right">{t.cols.last}</th><th className="px-3 py-2.5">{t.cols.status}</th><th className="px-3 py-2.5">{t.cols.passed}</th><th className="px-3 py-2.5 text-right">{t.cols.violations}</th></tr>
              </thead>
              <tbody className="divide-y divide-(--table-divider)">
                {res.data.data.map((r) => (
                  <tr key={r.user.id} className="hover:bg-(--table-row-hover)">
                    <td className="px-4 py-2.5"><p className="font-medium">{r.user.name}</p><p className="text-sm text-muted">{r.user.student_code ?? r.user.email}</p></td>
                    <td className="px-3 text-right tabular-nums">{r.attempts_used}</td>
                    <td className="px-3 text-right font-medium tabular-nums">{fmt(r.best_score)}</td>
                    <td className="px-3 text-right tabular-nums">{fmt(r.last_score)}</td>
                    <td className="px-3 text-sm text-muted">{t.attemptStatus[r.status] ?? r.status}</td>
                    <td className="px-3">{r.attempts_used === 0 ? <span className="text-sm text-muted">{t.notAttempted}</span> : <Badge tone={r.passed ? "success" : "danger"}>{r.passed ? t.pass : t.fail}</Badge>}</td>
                    <td className="px-3 text-right tabular-nums">{r.violations_count || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={res.data.meta} onPageChange={setPage} disabled={res.isFetching} />
      </div>
    </div>
  );
}
