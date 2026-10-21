"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "@/components/icons";
import { studioMessages as t } from "@/features/studio/messages";
import { STUDIO_NAV, isActive } from "./nav-config";

function crumbsFor(pathname: string): Array<{ label: string; href: string }> {
  const crumbs: Array<{ label: string; href: string }> = [{ label: t.nav.overview, href: "/studio" }];
  if (pathname === "/studio") return crumbs;
  const flat = STUDIO_NAV.flatMap((g) => g.items);
  const match = flat.filter((i) => i.href !== "/studio" && isActive(pathname, i.href)).sort((a, b) => b.href.length - a.href.length)[0];
  if (match) crumbs.push({ label: match.label, href: match.href });
  return crumbs;
}

export function StudioBreadcrumbs() {
  const crumbs = crumbsFor(usePathname());
  return (
    <nav aria-label={t.nav.breadcrumb} className="min-w-0">
      <ol className="flex items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.href} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <ChevronRightIcon className="size-3.5 shrink-0 text-muted" aria-hidden />}
              {last ? (
                <span aria-current="page" className="truncate font-medium">{c.label}</span>
              ) : (
                <Link href={c.href} className="truncate text-muted hover:text-foreground">{c.label}</Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
