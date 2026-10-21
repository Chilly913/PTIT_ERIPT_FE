"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MenuIcon, XIcon } from "@/components/icons";
import { Button, buttonStyles } from "@/components/ui/button";
import { StatusPanel } from "@/components/status-panel";
import { useSession } from "@/components/providers/session-provider";
import { messages } from "@/lib/messages";
import { studioMessages as t } from "@/features/studio/messages";
import { StudioBreadcrumbs } from "./breadcrumbs";
import { StudioSidebarNav } from "./sidebar-nav";
import { Logo } from "@/components/brand/logo";
import { LearnLink, StudioUserMenu } from "./user-menu";

function Brand() {
  return (
    <Link href="/studio" className="flex items-center gap-2.5 text-lg font-bold">
      <Logo className="h-9 w-auto" />
      <span>
        <span className="font-medium text-muted">{t.brand}</span>
      </span>
    </Link>
  );
}

/** Sidebar on >= lg, drawer below. Mirrors the admin shell visual language. */
export function StudioShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  const drawerRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const root = drawerRef.current;
    root?.querySelector<HTMLElement>("a,button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab" && root) {
        const f = root.querySelectorAll<HTMLElement>("a[href],button:not(:disabled)");
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const opener = openerRef.current;
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [open]);

  return (
    <div className="min-h-dvh">
      <a href="#content" className="sr-only z-[200] rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        {messages.common.skipToContent}
      </a>

      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-(--sidebar-border) bg-(--sidebar-bg) lg:flex">
        <div className="flex h-14 items-center border-b border-(--sidebar-border) px-5"><Brand /></div>
        <StudioSidebarNav />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-(--overlay)" onClick={() => setOpen(false)} aria-hidden />
          <div ref={drawerRef} role="dialog" aria-modal="true" aria-label={t.nav.main} className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-(--sidebar-bg) shadow-(--menu-shadow)">
            <div className="flex h-14 items-center justify-between border-b border-(--sidebar-border) px-5">
              <Brand />
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label={t.nav.closeMenu}>
                <XIcon className="size-5" aria-hidden />
              </Button>
            </div>
            <StudioSidebarNav onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-(--topbar-border) bg-(--topbar-bg) px-4 sm:px-6">
          <Button ref={openerRef} variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label={t.nav.openMenu} aria-expanded={open}>
            <MenuIcon className="size-5" aria-hidden />
          </Button>
          <div className="min-w-0 flex-1"><StudioBreadcrumbs /></div>
          <LearnLink />
          <StudioUserMenu />
        </header>
        <main id="content" className="mx-auto w-full max-w-[104rem] p-4 sm:p-6 lg:px-8 lg:py-7">{children}</main>
      </div>
    </div>
  );
}

/** 403 screen for users without the instructor/admin role. */
export function StudioForbidden() {
  const { logout } = useSession();
  return (
    <main id="main" className="min-h-dvh">
      <StatusPanel
        code="403"
        title={t.forbiddenTitle}
        text={t.forbiddenText}
        actions={
          <>
            <Link href="/my" className={buttonStyles()}>{t.forbiddenAction}</Link>
            <Button variant="outline" onClick={() => void logout()}>{t.userMenu.logout}</Button>
          </>
        }
      />
    </main>
  );
}
