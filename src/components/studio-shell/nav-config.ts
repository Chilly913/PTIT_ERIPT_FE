import {
  BarChartIcon,
  BookIcon,
  ClipboardCheckIcon,
  DashboardIcon,
  EditIcon,
  type IconComponent,
  LayersIcon,
  MapPinIcon,
  SchoolIcon,
  ListIcon,
  UsersIcon,
} from "@/components/icons";
import { studioMessages } from "@/features/studio/messages";

const n = studioMessages.nav;

export interface StudioNavItem {
  label: string;
  href: string;
  icon: IconComponent;
  /** false -> rendered disabled with a "Sắp có" badge. */
  enabled: boolean;
  /** Teaching tools are hidden from users who only manage classes (advisors). */
  teachOnly?: boolean;
}
export interface StudioNavGroup {
  label: string;
  items: StudioNavItem[];
}

/** Flip `enabled` when the matching module ships its UI. */
export const STUDIO_NAV: StudioNavGroup[] = [
  { label: n.groups.overview, items: [{ label: n.overview, href: "/studio", icon: DashboardIcon, enabled: true, teachOnly: true }] },
  {
    label: n.groups.teach,
    items: [
      { label: n.courses, href: "/studio/courses", icon: BookIcon, enabled: true, teachOnly: true },
      { label: n.students, href: "/studio/students", icon: UsersIcon, enabled: true, teachOnly: true },
    ],
  },
  { label: n.groups.classes, items: [{ label: n.classes, href: "/studio/classes", icon: SchoolIcon, enabled: true }] },
  {
    label: n.groups.exam,
    items: [
      { label: n.questionBank, href: "/studio/question-bank", icon: ListIcon, enabled: true, teachOnly: true },
      { label: n.questionGroups, href: "/studio/question-groups", icon: LayersIcon, enabled: true, teachOnly: true },
      { label: n.exams, href: "/studio/exams", icon: ClipboardCheckIcon, enabled: true, teachOnly: true },
      { label: n.grading, href: "/studio/grading", icon: EditIcon, enabled: true, teachOnly: true },
    ],
  },
  {
    label: n.groups.assess,
    items: [
      { label: n.grades, href: "/studio/grades", icon: BarChartIcon, enabled: true, teachOnly: true },
      { label: n.attendance, href: "/studio/attendance", icon: MapPinIcon, enabled: true, teachOnly: true },
    ],
  },
];

export function isActive(pathname: string, href: string) {
  return href === "/studio" ? pathname === "/studio" : pathname === href || pathname.startsWith(`${href}/`);
}
