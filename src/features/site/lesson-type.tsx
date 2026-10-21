import {
  ClipboardCheckIcon,
  ClipboardIcon,
  FileTextIcon,
  MapPinIcon,
  MessageIcon,
  MonitorIcon,
  VideoIcon,
  type IconComponent,
} from "@/components/icons";
import { HeadphonesIcon, HelpCircleIcon, PackageIcon } from "@/components/icons/icons-learn";
import { siteMessages as t } from "./messages";

const map: Record<string, IconComponent> = {
  video: VideoIcon,
  audio: HeadphonesIcon,
  file: FileTextIcon,
  document: FileTextIcon,
  page: FileTextIcon,
  quiz: HelpCircleIcon,
  assignment: ClipboardIcon,
  forum: MessageIcon,
  survey: ClipboardCheckIcon,
  scorm: PackageIcon,
  h5p: PackageIcon,
  virtual_class: MonitorIcon,
  zoom: MonitorIcon,
  meet: MonitorIcon,
  live: MonitorIcon,
  offline: MapPinIcon,
};

export function lessonIcon(type: string): IconComponent {
  return map[type] ?? FileTextIcon;
}

export function LessonTypeIcon({ type, size = 14, className }: { type: string; size?: number; className?: string }) {
  const Icon = map[type] ?? FileTextIcon;
  return <Icon size={size} className={className} />;
}

export function lessonTypeLabel(type: string): string {
  return t.lessonTypes[type] ?? type;
}
