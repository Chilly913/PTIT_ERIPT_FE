"use client";

import { Combobox } from "@/components/ui/combobox";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/errors";
import { useMyCourses } from "@/features/courses/api";
import { courseMessages as cm } from "@/features/courses/messages";

export function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}

export const errText = (e: unknown) => (isApiError(e) ? e.message : cm.common.loadError);

/** First 422 message per field, flattened to a record. */
export function fieldErrors(e: unknown): Record<string, string> {
  if (!isApiError(e) || !e.errors) return {};
  return Object.fromEntries(Object.entries(e.errors).map(([k, v]) => [k, v[0]]));
}

export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div aria-hidden>
      <Skeleton className="h-7 w-56" />
      <Skeleton className="mt-2 mb-6 h-4 w-80" />
      <div className="rounded-xl border border-border bg-surface">
        <div className="flex gap-3 p-4"><Skeleton className="h-9 w-56" /><Skeleton className="h-9 w-40" /></div>
        <div className="divide-y divide-border border-t border-border">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5"><Skeleton className="h-4 w-1/3" /><Skeleton className="ml-auto h-5 w-20" /></div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Dropdown of the caller's own courses. Empty value = none selected. */
export function CourseSelect({ value, onChange, placeholder = "Chọn khóa học", className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const q = useMyCourses({ per_page: 100, sort: "title" });
  return (
    <div className={className}>
      <Combobox value={value} onChange={onChange} aria-label={placeholder} placeholder={placeholder} searchPlaceholder="Tìm khóa học..." loading={q.isPending}
        options={(q.data?.data ?? []).map((c) => ({ value: String(c.id), label: c.title }))} />
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
      <span aria-hidden>←</span> {children}
    </Link>
  );
}

export function useQueryParam(name: string): [string, (v: string) => void] {
  // useSearchParams (inside the pages' Suspense boundary) gives the server and the client the same initial value;
  // reading window.location only on the client made deep links like ?course=1 mismatch on hydration.
  const search = useSearchParams();
  const [v, setV] = useState(() => search.get(name) ?? "");
  const set = (next: string) => {
    setV(next);
    const url = new URL(window.location.href);
    if (next) url.searchParams.set(name, next);
    else url.searchParams.delete(name);
    window.history.replaceState(null, "", url);
  };
  return [v, set];
}
