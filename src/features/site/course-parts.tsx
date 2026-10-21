"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { isApiError } from "@/lib/errors";
import { cn } from "@/lib/cn";
import { Alert } from "@/components/ui/alert";
import { Button, buttonStyles } from "@/components/ui/button";
import { ChevronDownIcon, LockIcon } from "@/components/icons";
import { clock, humanDuration } from "./format";
import { lessonIcon, lessonTypeLabel } from "./lesson-type";
import { siteMessages as t } from "./messages";
import { ReviewsPanel } from "./reviews";
import type { SectionOutline } from "./types";

/** Primary call to action on the course detail page. */
export function EnrollCta({
  courseId,
  slug,
  free,
  enrolled,
  loggedIn,
  className,
}: {
  courseId: number;
  slug: string;
  free: boolean;
  enrolled: boolean;
  loggedIn: boolean;
  className?: string;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const [error, setError] = useState("");

  const enroll = useMutation({
    mutationFn: () => api.post(`/courses/${courseId}/enroll`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["site", "enrollments"] });
      router.push(`/learn/${slug}`);
    },
    onError: (e) => {
      if (isApiError(e) && (e.status === 404 || e.status === 405 || e.status === 502)) setError(t.course.enrollNotReady);
      else setError(isApiError(e) && e.message ? e.message : t.course.enrollError);
    },
  });

  if (enrolled) {
    return (
      <div className={className}>
        <Link href={`/learn/${slug}`} prefetch className={buttonStyles({ size: "lg", className: "w-full" })}>{t.course.continue}</Link>
        <p className="mt-2 text-center text-sm text-success">{t.course.enrolled}</p>
      </div>
    );
  }
  if (!free) {
    return (
      <div className={className}>
        <Button size="lg" className="w-full" disabled>{t.course.paidSoon}</Button>
      </div>
    );
  }
  if (!loggedIn) {
    return (
      <div className={className}>
        <Link href={`/login?next=${encodeURIComponent(`/courses/${slug}`)}`} className={buttonStyles({ size: "lg", className: "w-full" })}>{t.course.loginToEnroll}</Link>
      </div>
    );
  }
  return (
    <div className={className}>
      <Button size="lg" className="w-full" loading={enroll.isPending} onClick={() => { setError(""); enroll.mutate(); }}>
        {enroll.isPending ? t.course.enrolling : t.course.enroll}
      </Button>
      {error && <Alert tone="danger" className="mt-3">{error}</Alert>}
    </div>
  );
}

/** Curriculum accordion: sections expand independently, preview lessons are flagged. */
export function Curriculum({ sections, slug, enrolled }: { sections: SectionOutline[]; slug: string; enrolled: boolean }) {
  const [open, setOpen] = useState<Set<number>>(() => new Set(sections.slice(0, 1).map((s) => s.id)));
  const allOpen = open.size === sections.length;
  const toggle = (id: number) =>
    setOpen((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button type="button" className="text-sm font-medium text-primary hover:underline" onClick={() => setOpen(allOpen ? new Set() : new Set(sections.map((s) => s.id)))}>
          {allOpen ? t.course.collapseAll : t.course.expandAll}
        </button>
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
        {sections.map((s) => {
          const isOpen = open.has(s.id);
          const dur = s.lessons.reduce((a, l) => a + l.duration, 0);
          return (
            <li key={s.id}>
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`sec-${s.id}`}
                  onClick={() => toggle(s.id)}
                  className="flex w-full items-center gap-3 bg-surface-subtle px-4 py-3 text-left transition-colors hover:bg-surface-muted"
                >
                  <ChevronDownIcon size={16} className={cn("transition-transform", !isOpen && "-rotate-90")} />
                  <span className="flex-1 font-semibold">{s.title || t.course.unnamedSection}</span>
                  <span className="shrink-0 text-sm text-muted">{t.course.lessons(s.lessons.length)}{dur ? ` · ${humanDuration(dur)}` : ""}</span>
                </button>
              </h3>
              {isOpen && (
                <ul id={`sec-${s.id}`} className="divide-y divide-border border-t border-border">
                  {s.lessons.map((l) => {
                    const Icon = lessonIcon(l.type);
                    const canOpen = enrolled || l.is_preview;
                    const body = (
                      <>
                        <Icon size={16} className="text-muted" />
                        <span className="min-w-0 flex-1 truncate">{l.title}</span>
                        <span className="hidden shrink-0 text-xs text-muted sm:inline">{lessonTypeLabel(l.type)}</span>
                        {l.is_preview && !enrolled && <span className="shrink-0 text-xs font-medium text-primary">{t.course.preview}</span>}
                        {!canOpen && <LockIcon size={14} className="shrink-0 text-muted" aria-label={t.course.locked} />}
                        {l.duration > 0 && <span className="w-14 shrink-0 text-right text-xs text-muted tabular-nums">{clock(l.duration)}</span>}
                      </>
                    );
                    return (
                      <li key={l.id}>
                        {canOpen ? (
                          <Link href={`/learn/${slug}/${l.id}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface-subtle">{body}</Link>
                        ) : (
                          <div className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted">{body}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Reviews block of the detail page: refreshes the server-rendered aggregate after a change. */
export function CourseReviews({ courseId, userId, isEnrolled }: { courseId: number; userId: number | null; isEnrolled: boolean }) {
  const router = useRouter();
  return <ReviewsPanel courseId={courseId} userId={userId} isEnrolled={isEnrolled} onChanged={() => router.refresh()} />;
}
