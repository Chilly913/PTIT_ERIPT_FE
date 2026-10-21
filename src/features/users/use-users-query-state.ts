"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { UsersQuery, UserStatusFilter } from "./types";

export const PER_PAGE_OPTIONS = [10, 20, 50, 100] as const;
const DEFAULT_SORT = "-created_at";
const SORTS = ["-created_at", "created_at", "name", "-name", "email", "-email"];
const STATUSES = ["active", "disabled", "unverified"];

/** List state lives in the URL: shareable, and the back button restores it. */
export function useUsersQueryState() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const state = useMemo<UsersQuery>(() => {
    const page = Number(sp.get("page"));
    const per = Number(sp.get("per_page"));
    const sort = sp.get("sort") ?? "";
    const status = sp.get("status") ?? "";
    return {
      page: Number.isInteger(page) && page > 0 ? page : 1,
      per_page: (PER_PAGE_OPTIONS as readonly number[]).includes(per) ? per : 20,
      q: sp.get("q") ?? "",
      role: sp.get("role") ?? "",
      status: (STATUSES.includes(status) ? status : "") as UserStatusFilter,
      sort: SORTS.includes(sort) ? sort : DEFAULT_SORT,
    };
  }, [sp]);

  const set = useCallback(
    (patch: Partial<UsersQuery>) => {
      const next: UsersQuery = { ...state, ...patch };
      if (!("page" in patch)) next.page = 1;
      const out = new URLSearchParams();
      if (next.q) out.set("q", next.q);
      if (next.role) out.set("role", next.role);
      if (next.status) out.set("status", next.status);
      if (next.sort !== DEFAULT_SORT) out.set("sort", next.sort);
      if (next.per_page !== 20) out.set("per_page", String(next.per_page));
      if (next.page > 1) out.set("page", String(next.page));
      const qs = out.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      // Typing replaces the entry (no history spam); filters/paging push so Back steps through them.
      if (Object.keys(patch).every((k) => k === "q")) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [state, router, pathname],
  );

  const isFiltered = !!(state.q || state.role || state.status);
  return { state, set, isFiltered };
}
