"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { CourseCard, CourseCardSkeleton } from "@/components/site/course-card";
import { QueryError } from "@/components/site/query-state";
import { ChevronLeftIcon, ChevronRightIcon, FilterIcon, SearchIcon, XIcon } from "@/components/icons";
import { siteMessages as t } from "./messages";
import { LEVELS, SORTS, readFilters, toQueryString, type Filters } from "./catalog-filters";
import type { CategoryNode, CourseSummary, LegacyPage } from "./types";

const PER_PAGE = 12;

function fetchCourses(f: Filters) {
  return api.get<LegacyPage<CourseSummary>>("/courses", {
    query: { search: f.q, category: f.category, level: f.level, pricing: f.pricing, sort: f.sort, page: f.page, per_page: PER_PAGE },
  });
}

function CategoryFilter({ tree, value, onChange }: { tree: CategoryNode[]; value: string; onChange: (slug: string) => void }) {
  const roots = tree.filter((c) => c.parent_id === null);
  const item = (c: CategoryNode, depth: number) => {
    const active = value === c.slug;
    return (
      <li key={c.id}>
        <button
          type="button"
          aria-pressed={active}
          onClick={() => onChange(active ? "" : c.slug)}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors hover:bg-surface-muted",
            active && "bg-primary-soft font-semibold text-primary-soft-foreground hover:bg-primary-soft",
          )}
          style={{ paddingLeft: `${0.75 + depth * 0.9}rem` }}
        >
          <span className="truncate">{c.name}</span>
          <span className="text-xs text-muted">{c.courses_count}</span>
        </button>
        {c.children && c.children.length > 0 && <ul>{c.children.map((ch) => item(ch, depth + 1))}</ul>}
      </li>
    );
  };
  return (
    <ul className="space-y-0.5">
      <li>
        <button
          type="button"
          aria-pressed={!value}
          onClick={() => onChange("")}
          className={cn("w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors hover:bg-surface-muted", !value && "bg-primary-soft font-semibold text-primary-soft-foreground hover:bg-primary-soft")}
        >
          {t.catalog.allCategories}
        </button>
      </li>
      {roots.map((c) => item(c, 0))}
    </ul>
  );
}

export function CatalogView({ categories, initial, initialKey }: { categories: CategoryNode[]; initial: LegacyPage<CourseSummary> | null; initialKey: string }) {
  const sp = useSearchParams();
  const f = useMemo(() => readFilters(new URLSearchParams(sp.toString())), [sp]);
  const key = toQueryString(f);
  const [typed, setTyped] = useState<{ base: string; v: string }>({ base: f.q, v: f.q });
  const search = typed.base === f.q ? typed.v : f.q;
  const setSearch = (v: string) => setTyped({ base: f.q, v });
  const [showFilters, setShowFilters] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);


  const update = useCallback(
    (patch: Partial<Filters>, mode: "push" | "replace" = "push") => {
      const next = { ...f, ...patch, page: patch.page ?? 1 };
      const qs = toQueryString(next);
      const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
      if (mode === "push") window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
    },
    [f],
  );

  const list = useQuery({
    queryKey: ["site", "courses", key],
    queryFn: () => fetchCourses(f),
    placeholderData: keepPreviousData,
    initialData: key === initialKey && initial ? initial : undefined,
    staleTime: 60_000,
  });

  const onSearch = (v: string) => {
    setSearch(v);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => update({ q: v.trim() }, "replace"), 300);
  };

  const active = [f.category, f.level, f.pricing, f.q].filter(Boolean).length;
  const reset = () => {
    setSearch("");
    update({ q: "", category: "", level: "", pricing: "", sort: "newest" });
  };
  const rows = list.data?.data ?? [];
  const lastPage = list.data?.last_page ?? 1;

  const filtersPanel = (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm font-semibold">{t.catalog.category}</p>
        <CategoryFilter tree={categories} value={f.category} onChange={(slug) => update({ category: slug })} />
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">{t.catalog.level}</p>
        <div className="flex flex-wrap gap-2">
          {["", ...LEVELS].map((l) => (
            <button
              key={l || "all"}
              type="button"
              aria-pressed={f.level === l}
              onClick={() => update({ level: l })}
              className={cn("rounded-full border px-3 py-1 text-sm transition-colors", f.level === l ? "border-primary bg-primary-soft font-semibold text-primary-soft-foreground" : "border-border hover:bg-surface-muted")}
            >
              {l ? t.levels[l] : t.catalog.allLevels}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">{t.catalog.price}</p>
        <div className="flex flex-wrap gap-2">
          {[["", t.catalog.allPrices], ["free", t.catalog.free], ["paid", t.catalog.paid]].map(([v, label]) => (
            <button
              key={v || "all"}
              type="button"
              aria-pressed={f.pricing === v}
              onClick={() => update({ pricing: v })}
              className={cn("rounded-full border px-3 py-1 text-sm transition-colors", f.pricing === v ? "border-primary bg-primary-soft font-semibold text-primary-soft-foreground" : "border-border hover:bg-surface-muted")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {active > 0 && (
        <Button variant="ghost" size="sm" onClick={reset}><XIcon size={14} />{t.catalog.clear}</Button>
      )}
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
      <aside aria-label={t.catalog.filters} className="lg:sticky lg:top-20 lg:self-start">
        <button
          type="button"
          aria-expanded={showFilters}
          onClick={() => setShowFilters((s) => !s)}
          className="flex w-full items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium lg:hidden"
        >
          <span className="inline-flex items-center gap-2"><FilterIcon size={16} />{t.catalog.filters}{active > 0 && ` (${active})`}</span>
          <ChevronRightIcon size={16} className={cn("transition-transform", showFilters && "rotate-90")} />
        </button>
        <div className={cn("mt-3 rounded-xl border border-border bg-surface p-4 lg:mt-0 lg:block", showFilters ? "block" : "hidden")}>{filtersPanel}</div>
      </aside>

      <section aria-label={t.catalog.title} aria-busy={list.isFetching}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <SearchIcon size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={t.catalog.search}
              aria-label={t.catalog.search}
              className="h-10 w-full rounded-lg border border-border-control bg-surface pr-3 pl-9 text-sm placeholder:text-muted focus:border-primary focus:outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span className="shrink-0 text-muted">{t.catalog.sort}</span>
            <Select value={f.sort} onChange={(e) => update({ sort: e.target.value })} className="w-44">
              {SORTS.map((s) => <option key={s} value={s}>{t.catalog.sorts[s]}</option>)}
            </Select>
          </label>
        </div>
        <p className="mt-3 h-5 text-sm text-muted" aria-live="polite">{list.data ? t.catalog.results(list.data.total) : ""}</p>

        <div className={cn("mt-3 transition-opacity", list.isFetching && !list.isPending && "opacity-60")}>
          {list.isPending ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => <CourseCardSkeleton key={i} />)}
            </div>
          ) : list.isError && !list.data ? (
            <QueryError error={list.error} onRetry={() => list.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<SearchIcon />}
              title={t.catalog.emptyTitle}
              description={t.catalog.emptyText}
              action={active > 0 ? <Button variant="outline" onClick={reset}>{t.catalog.clear}</Button> : undefined}
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((c, i) => <CourseCard key={c.id} course={c} priority={i < 3} />)}
            </div>
          )}
        </div>

        {lastPage > 1 && (
          <nav aria-label="Phân trang" className="mt-8 flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" disabled={f.page <= 1} onClick={() => { update({ page: f.page - 1 }); window.scrollTo({ top: 0 }); }}>
              <ChevronLeftIcon size={14} />{"Trước"}
            </Button>
            <span className="text-sm text-muted">{t.catalog.pageOf(f.page, lastPage)}</span>
            <Button variant="outline" size="sm" disabled={f.page >= lastPage} onClick={() => { update({ page: f.page + 1 }); window.scrollTo({ top: 0 }); }}>
              {"Sau"}<ChevronRightIcon size={14} />
            </Button>
          </nav>
        )}
      </section>
    </div>
  );
}

