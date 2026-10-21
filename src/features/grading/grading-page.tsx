"use client";

import Link from "next/link";
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { EditIcon, SearchIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Paginated } from "@/lib/types";
import { LoadError } from "@/features/courses/parts";
import { fmtDateTime } from "@/features/courses/utils";
import { PageSkeleton, useDebounced } from "@/features/studio/common";
import { gradingMessages as m } from "./messages";
import type { GradingRow } from "./types";

export const GradingSkeleton = () => <PageSkeleton rows={5} />;

const TABS = ["pending", "graded", "all"] as const;

export function GradingPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("pending");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q.trim());
  const params = { status: tab, q: dq || undefined, page, per_page: 15 };
  const list = useQuery({
    queryKey: ["studio", "grading", params],
    queryFn: () => api.get<Paginated<GradingRow>>("/grading/attempts", { query: params }),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

  return (
    <>
      <PageHeader title={m.title} description={m.description} />
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div role="tablist" aria-label={m.title} className="flex gap-1 rounded-lg bg-surface-muted p-1">
            {TABS.map((k) => (
              <button
                key={k}
                role="tab"
                type="button"
                aria-selected={tab === k}
                onClick={() => { setTab(k); setPage(1); }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === k ? "bg-surface shadow-sm" : "text-muted hover:text-foreground"}`}
              >
                {m.tabs[k]}
              </button>
            ))}
          </div>
          <div className="relative min-w-48 flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={m.search} aria-label={m.search} className="pl-9" />
          </div>
        </div>
        <div className="border-t border-border">
          {list.isPending ? (
            <div className="divide-y divide-border" aria-hidden>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex items-center gap-4 px-5 py-4"><Skeleton className="h-4 w-1/3" /><Skeleton className="ml-auto h-5 w-20" /></div>)}</div>
          ) : list.isError ? (
            <LoadError onRetry={() => void list.refetch()} />
          ) : list.data.data.length === 0 ? (
            <EmptyState icon={<EditIcon />} title={tab === "pending" ? m.emptyPending : m.emptyOther} description={tab === "pending" ? m.emptyPendingText : undefined} />
          ) : (
            <ul className={`divide-y divide-border transition-opacity ${list.isFetching ? "opacity-70" : ""}`}>
              {list.data.data.map((r) => (
                <li key={r.id}>
                  <Link href={`/studio/grading/${r.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-surface-subtle">
                    <div className="min-w-0 flex-1 basis-60">
                      <p className="truncate font-medium">{r.student.name}{r.student.student_code ? ` · ${r.student.student_code}` : ""}</p>
                      <p className="truncate text-sm text-muted">{r.title} · {m.kind[r.kind]}{r.course_title ? ` · ${r.course_title}` : ""}</p>
                    </div>
                    <span className="hidden text-sm text-muted md:block">{m.submittedAt(fmtDateTime(r.submitted_at))}</span>
                    <span className="text-sm text-muted tabular-nums">{m.score(r.score)}</span>
                    <Badge tone={r.grading_status === "pending" ? "warning" : "success"}>{m.status[r.grading_status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Pagination meta={list.data?.meta} onPageChange={setPage} disabled={list.isFetching} />
      </Card>
    </>
  );
}
