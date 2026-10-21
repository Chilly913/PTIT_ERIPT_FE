"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { messages } from "@/lib/messages";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/components/providers/session-provider";
import { isAdmin } from "@/lib/auth-utils";
import { isActive, NAV } from "./nav-config";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useSession();
  // Academic managers (giáo vụ) only get the academic structure; everything else is for admins.
  const groups = isAdmin(user) ? NAV : NAV.filter((g) => g.academic);
  return (
    <nav aria-label={messages.admin.nav.main} className="flex-1 overflow-y-auto px-3 py-4">
      {groups.map((group) => (
        <div key={group.label} className="mb-5">
          <p className="mb-1.5 px-3 text-xs font-semibold tracking-wide text-(color:--sidebar-group-fg) uppercase">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map(({ label, href, icon: Icon, enabled }) => {
              const active = enabled && isActive(pathname, href);
              const base = "flex items-center gap-3 rounded-lg px-3 py-2 font-medium";
              return (
                <li key={href}>
                  {enabled ? (
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(base, "transition-colors", active ? "bg-(--sidebar-item-active-bg) text-(color:--sidebar-item-active-fg)" : "text-(color:--sidebar-fg) hover:bg-(--sidebar-item-hover)")}
                    >
                      <Icon className="size-4.5 shrink-0" aria-hidden /> {label}
                    </Link>
                  ) : (
                    <span aria-disabled="true" className={cn(base, "cursor-not-allowed text-(color:--sidebar-item-disabled-fg)")}>
                      <Icon className="size-4.5 shrink-0" aria-hidden />
                      <span className="flex-1">{label}</span>
                      <Badge className="text-[0.7rem]">{messages.common.comingSoon}</Badge>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}