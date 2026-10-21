"use client";

import Link from "next/link";
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronRightIcon, SchoolIcon, SearchIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Combobox, type ComboOption } from "@/components/ui/combobox";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { Paginated } from "@/lib/types";
import { LoadError } from "@/features/courses/parts";
import { PageSkeleton, useDebounced } from "@/features/studio/common";
import { classMessages as m } from "./messages";
import type { ClassSummary } from "./types";

const t = m.list;
export const ClassesSkeleton = () => <PageSkeleton rows={5} />;

export function ClassesPage() {
  const [q, setQ] = useState("");
  const [cohorts, setCohorts] = useState<string[]>([]);
  const [programs, setPrograms] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const dq = useDebounced(q.trim());

  const filters = useQuery({
    queryKey: ["classes", "filters"],
    queryFn: () => api.get<{ cohorts: ComboOption[]; programs: ComboOption[]; years: ComboOption[] }>("/classes/filters"),
    staleTime: 60_000,
  });
  const params = { q: dq || undefined, cohort_id: cohorts.join(",") || undefined, program_id: programs.join(",") || undefined, year: years.join(",") || undefined, page, per_page: 20 };
  const list = useQuery({
    queryKey: ["classes", "list", params],
    queryFn: () => api.get<Paginated<ClassSummary>>("/classes", { query: params }),
    placeholderData: keepPreviousData,
  });
  const filtered = !!(dq || cohorts.length || programs.length || years.length);
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <>
      <PageHeader title={t.title} description={t.description} />
      <Card>
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-56 flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={t.search} aria-label={t.search} className="pl-9" />
          </div>
          <Combobox multiple className="w-full sm:w-56" value={cohorts} onChange={reset(setCohorts)} options={filters.data?.cohorts ?? []} placeholder={t.allCohorts} searchPlaceholder={`${t.cohort}...`} aria-label={t.cohort} />
          <Combobox multiple className="w-full sm:w-56" value={programs} onChange={reset(setPrograms)} options={filters.data?.programs ?? []} placeholder={t.allPrograms} searchPlaceholder={`${t.program}...`} aria-label={t.program} />
          <Combobox multiple className="w-full sm:w-48" value={years} onChange={reset(setYears)} options={filters.data?.years ?? []} placeholder={t.allYears} searchPlaceholder={`${t.year}...`} aria-label={t.year} />
        </div>
        <div className="border-t border-border">
          {list.isPending ? (
            <div className="divide-y divide-border" aria-hidden>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="flex items-center gap-4 px-5 py-4"><Skeleton className="h-4 w-1/3" /><Skeleton className="ml-auto h-4 w-24" /></div>)}</div>
          ) : list.isError ? (
            <LoadError onRetry={() => void list.refetch()} />
          ) : list.data.data.length === 0 ? (
            <EmptyState icon={<SchoolIcon />} title={filtered ? t.noResults : t.emptyTitle} description={filtered ? undefined : t.emptyText} />
          ) : (
            <ul className={`divide-y divide-border transition-opacity ${list.isFetching ? "opacity-70" : ""}`}>
              {list.data.data.map((c) => (
                <li key={c.id}>
                  <Link href={`/studio/classes/${c.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-subtle">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium"><span>{c.code}</span><span className="truncate text-muted">{c.name}</span></p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                        <Badge>{c.program.code}</Badge>
                        {c.cohort && <span>{c.cohort.name}</span>}
                        <span>{c.advisor ? `${t.advisor}: ${c.advisor.name}` : t.noAdvisor}</span>
                      </p>
                    </div>
                    <span className="hidden text-sm text-muted sm:block">{c.curriculum ? c.curriculum.name : t.noCurriculum}</span>
                    <span className="w-28 shrink-0 text-right text-sm tabular-nums">{t.students(c.student_count)}</span>
                    <ChevronRightIcon className="size-4 shrink-0 text-muted" aria-hidden />
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
