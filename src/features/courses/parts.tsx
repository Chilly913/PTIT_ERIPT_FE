"use client";

import { useState } from "react";
import {
  AlertTriangleIcon,
  BoxIcon,
  ClipboardCheckIcon,
  ClipboardIcon,
  type IconComponent,
  FileTextIcon,
  ImageIcon,
  MapPinIcon,
  MessageIcon,
  MonitorIcon,
  PaperclipIcon,
  VideoIcon,
} from "@/components/icons";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { courseMessages as m } from "./messages";
import type { CourseStatus } from "./types";

const STATUS_TONE: Record<CourseStatus, BadgeTone> = {
  draft: "neutral",
  pending_review: "warning",
  published: "success",
  closed: "info",
  rejected: "danger",
};

export function StatusBadge({ status }: { status: CourseStatus }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{m.status[status] ?? status}</Badge>;
}

const TYPE_ICON: Record<string, IconComponent> = {
  video: VideoIcon,
  audio: VideoIcon,
  page: FileTextIcon,
  document: PaperclipIcon,
  file: PaperclipIcon,
  quiz: ClipboardCheckIcon,
  assignment: ClipboardIcon,
  virtual_class: MonitorIcon,
  zoom: MonitorIcon,
  meet: MonitorIcon,
  live: MonitorIcon,
  scorm: BoxIcon,
  h5p: BoxIcon,
  offline: MapPinIcon,
  forum: MessageIcon,
  survey: ClipboardIcon,
};

export function LessonTypeIcon({ type, className }: { type: string; className?: string }) {
  const Icon = TYPE_ICON[type] ?? FileTextIcon;
  return <Icon className={cn("size-4", className)} aria-hidden />;
}

/** Shown when a feature endpoint is not deployed yet (404/405). */
export function NotReady({ title = m.common.notReady, hint = m.common.notReadyHint }: { title?: string; hint?: string }) {
  return <EmptyState icon={<AlertTriangleIcon />} title={title} description={hint} />;
}

export function LoadError({ onRetry, message = m.common.loadError }: { onRetry?: () => void; message?: string }) {
  return (
    <EmptyState
      icon={<AlertTriangleIcon />}
      title={message}
      action={onRetry ? <Button variant="outline" size="sm" onClick={onRetry}>{m.common.retry}</Button> : undefined}
    />
  );
}

/** Image from a plain URL with a neutral placeholder when empty or broken. */
export function Thumb({ src, alt = "", className, rounded = "rounded-lg" }: { src: string | null | undefined; alt?: string; className?: string; rounded?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const ok = !!src && failed !== src;
  return (
    <div className={cn("relative aspect-video shrink-0 overflow-hidden border border-border bg-surface-muted", rounded, className)}>
      {ok ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" decoding="async" className="size-full object-cover" onError={() => setFailed(src)} />
      ) : (
        <div className="flex size-full items-center justify-center text-muted" aria-hidden>
          <ImageIcon className="size-5" />
        </div>
      )}
    </div>
  );
}

export function SectionCard({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border bg-surface", className)}>
      <header className="border-b border-border px-5 py-3.5">
        <h3 className="text-base font-semibold">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </header>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}
