"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BellIcon } from "@/components/icons";
import { Spinner } from "@/components/ui/spinner";
import { siteMessages as t } from "@/features/site/messages";
import { timeAgo } from "@/features/site/format";

interface NotificationItem {
  id: number;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

/**
 * Bell with unread badge. The endpoint may not exist yet (404): then the bell simply shows no badge
 * and the popover says there is nothing to show, it never throws.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();

  const count = useQuery({
    queryKey: ["site", "notifications", "unread"],
    queryFn: () => api.get<{ count: number }>("/notifications/unread-count"),
    refetchInterval: 90_000,
    staleTime: 60_000,
    retry: false,
  });
  const list = useQuery({
    queryKey: ["site", "notifications", "list"],
    queryFn: async () => {
      const r = await api.get<{ data?: NotificationItem[] } | NotificationItem[]>("/notifications", { query: { per_page: 8 } });
      return Array.isArray(r) ? r : (r.data ?? []);
    },
    enabled: open,
    retry: false,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = count.data?.count ?? 0;
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label={unread ? `${t.nav.notifications} (${unread})` : t.nav.notifications}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
      >
        <BellIcon size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-4 font-bold text-danger-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          id={panelId}
          className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-surface shadow-lg animate-[pop-in_0.12s_ease-out]"
        >
          <p className="border-b border-border px-4 py-2.5 text-sm font-semibold">{t.nav.notifications}</p>
          <div className="max-h-80 overflow-y-auto">
            {list.isPending ? (
              <div className="flex justify-center p-6"><Spinner /></div>
            ) : list.isError ? (
              <p className="p-4 text-sm text-muted">{t.nav.notificationsError}</p>
            ) : list.data.length === 0 ? (
              <p className="p-4 text-sm text-muted">{t.nav.notificationsEmpty}</p>
            ) : (
              <ul>
                {list.data.map((n) => {
                  const inner = (
                    <>
                      <span className="flex items-start gap-2">
                        {!n.read && <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{n.title}</span>
                          <span className="line-clamp-2 block text-sm text-muted">{n.body}</span>
                          <span className="block text-xs text-muted">{timeAgo(n.created_at)}</span>
                        </span>
                      </span>
                    </>
                  );
                  return (
                    <li key={n.id} className="border-b border-border last:border-0">
                      {n.link && n.link.startsWith("/") ? (
                        <Link href={n.link} onClick={() => setOpen(false)} className="block px-4 py-2.5 hover:bg-surface-muted">{inner}</Link>
                      ) : (
                        <div className="px-4 py-2.5">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
