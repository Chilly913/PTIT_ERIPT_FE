"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { messages } from "@/lib/messages";
import { breadcrumbsFor } from "./nav-config";
import { ChevronRightIcon } from "@/components/icons";

export function Breadcrumbs() {
  const crumbs = breadcrumbsFor(usePathname());
  return (
    <nav aria-label={messages.admin.nav.breadcrumb} className="min-w-0">
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