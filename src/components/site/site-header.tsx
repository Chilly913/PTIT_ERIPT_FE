"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/cn";
import { homeFor } from "@/lib/auth-utils";
import type { User } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { buttonStyles } from "@/components/ui/button";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { MenuIcon, SearchIcon, XIcon } from "@/components/icons";
import { Logo } from "@/components/brand/logo";
import { NotificationBell } from "./notification-bell";
import { siteMessages as t } from "@/features/site/messages";

function SearchBox({ className, onDone }: { className?: string; onDone?: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        const v = q.trim();
        router.push(v ? `/courses?q=${encodeURIComponent(v)}` : "/courses");
        onDone?.();
      }}
    >
      <SearchIcon size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t.nav.searchPlaceholder}
        aria-label={t.nav.searchLabel}
        className="h-9 w-full rounded-lg border border-border-control bg-surface pr-3 pl-9 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring"
      />
    </form>
  );
}

export function SiteHeader({ user }: { user: User | null; siteName?: string; logo?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const setOpen = (v: boolean | ((o: boolean) => boolean)) => setOpenFor((cur) => ((typeof v === "function" ? v(cur === pathname) : v) ? pathname : null));


  const logout = async () => {
    try {
      await apiRequest("POST", "/session/logout");
    } finally {
      qc.clear();
      router.replace("/");
      router.refresh();
    }
  };

  const link = (href: string, label: string) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn("rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-muted", active ? "text-primary" : "text-foreground")}
      >
        {label}
      </Link>
    );
  };

  const home = user ? homeFor(user) : null;
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 rounded-lg text-base font-bold" aria-label="ERIPT – Viện Kinh tế Bưu điện">
          <Logo className="h-11 w-auto" priority />
        </Link>

        <nav aria-label={t.nav.primary} className="ml-2 hidden items-center gap-1 md:flex">
          {link("/courses", t.nav.courses)}
          {link("/news", t.nav.news)}
          {user && link("/my", t.nav.myLearning)}
        </nav>

        <SearchBox className="mx-2 hidden max-w-md flex-1 md:block" />

        <div className="ml-auto flex items-center gap-1.5">
          {user ? (
            <>
              <NotificationBell />
              <Dropdown>
                <DropdownTrigger
                  aria-label={t.nav.account}
                  className="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-surface-muted"
                >
                  <Avatar name={user.name} src={user.avatar} size="md" />
                </DropdownTrigger>
                <DropdownContent align="end" className="w-60">
                  <DropdownLabel>
                    <span className="block truncate text-foreground">{user.name}</span>
                    <span className="block truncate text-xs font-normal">{user.email}</span>
                  </DropdownLabel>
                  <DropdownSeparator />
                  <DropdownItem href="/my">{t.nav.myLearning}</DropdownItem>
                  {home && home !== "/my" && <DropdownItem href={home}>{home === "/admin" ? t.nav.admin : t.nav.studio}</DropdownItem>}
                  <DropdownSeparator />
                  <DropdownItem danger onSelect={logout}>{t.nav.logout}</DropdownItem>
                </DropdownContent>
              </Dropdown>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href={`/login?next=${encodeURIComponent(pathname)}`} className={buttonStyles({ variant: "ghost" })}>{t.nav.login}</Link>
              <Link href="/register" className={buttonStyles()}>{t.nav.register}</Link>
            </div>
          )}
          <button
            type="button"
            aria-label={open ? t.nav.closeMenu : t.nav.menu}
            aria-expanded={open}
            aria-controls="site-mobile-menu"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex size-9 items-center justify-center rounded-lg text-foreground hover:bg-surface-muted md:hidden"
          >
            {open ? <XIcon size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div id="site-mobile-menu" className="border-t border-border bg-surface px-4 py-3 md:hidden">
          <SearchBox onDone={() => setOpen(false)} />
          <nav aria-label={t.nav.primary} className="mt-3 flex flex-col">
            {link("/courses", t.nav.courses)}
            {link("/news", t.nav.news)}
            {user && link("/my", t.nav.myLearning)}
          </nav>
          {!user && (
            <div className="mt-3 flex gap-2">
              <Link href={`/login?next=${encodeURIComponent(pathname)}`} className={buttonStyles({ variant: "outline", className: "flex-1" })}>{t.nav.login}</Link>
              <Link href="/register" className={buttonStyles({ className: "flex-1" })}>{t.nav.register}</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
