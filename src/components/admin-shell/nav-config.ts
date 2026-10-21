import { messages } from "@/lib/messages";
import { BellIcon, BookIcon, ClipboardCheckIcon, DashboardIcon, type IconComponent, BookIcon as ProgramIcon, CalendarIcon, ClockIcon, KeyIcon, LayersIcon, NewsIcon, UsersIcon as ClassIcon, UserCheckIcon, SchoolIcon, SettingsIcon, UsersIcon } from "@/components/icons";

const n = messages.admin.nav;

export interface NavItem {
  label: string;
  href: string;
  icon: IconComponent;
  /** false -> rendered disabled with a "Sắp có" badge. */
  enabled: boolean;
}
export interface NavGroup {
  label: string;
  /** Visible to academic managers as well as admins. */
  academic?: boolean;
  items: NavItem[];
}

/** To enable a module later: flip `enabled` to true and add its pages under src/app/(admin)/admin/. */
export const NAV: NavGroup[] = [
  { label: n.groups.overview, items: [{ label: n.dashboard, href: "/admin", icon: DashboardIcon, enabled: true }] },
  {
    label: n.groups.manage,
    items: [
      { label: n.users, href: "/admin/users", icon: UsersIcon, enabled: true },
      { label: n.roles, href: "/admin/roles", icon: KeyIcon, enabled: true },
    ],
  },
  {
    label: n.groups.academic,
    academic: true,
    items: [
      { label: n.programTypes, href: "/admin/academic/program-types", icon: LayersIcon, enabled: true },
      { label: n.programs, href: "/admin/academic/programs", icon: ProgramIcon, enabled: true },
      { label: n.academicYears, href: "/admin/academic/academic-years", icon: CalendarIcon, enabled: true },
      { label: n.terms, href: "/admin/academic/terms", icon: ClockIcon, enabled: true },
      { label: n.cohorts, href: "/admin/academic/cohorts", icon: UserCheckIcon, enabled: true },
      { label: n.classes, href: "/admin/academic/classes", icon: ClassIcon, enabled: true },
    ],
  },
  {
    label: n.groups.content,
    items: [
      { label: n.courses, href: "/admin/courses", icon: BookIcon, enabled: true },
      { label: n.exams, href: "/admin/exams", icon: ClipboardCheckIcon, enabled: false },
      { label: n.training, href: "/admin/training", icon: SchoolIcon, enabled: false },
      { label: n.news, href: "/admin/news", icon: NewsIcon, enabled: true },
      { label: n.partners, href: "/admin/partners", icon: LayersIcon, enabled: true },
      { label: n.notifications, href: "/admin/notifications", icon: BellIcon, enabled: false },
    ],
  },
  { label: n.groups.system, items: [{ label: n.settings, href: "/admin/settings", icon: SettingsIcon, enabled: true }] },
];

export function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Breadcrumb trail for a pathname: [{label, href}] starting at "Tổng quan". */
export function breadcrumbsFor(pathname: string): Array<{ label: string; href: string }> {
  const crumbs: Array<{ label: string; href: string }> = [{ label: n.dashboard, href: "/admin" }];
  if (pathname === "/admin") return crumbs;
  const flat = NAV.flatMap((g) => g.items);
  const match = flat.filter((i) => i.href !== "/admin" && isActive(pathname, i.href)).sort((a, b) => b.href.length - a.href.length)[0];
  if (match) crumbs.push({ label: match.label, href: match.href });
  return crumbs;
}