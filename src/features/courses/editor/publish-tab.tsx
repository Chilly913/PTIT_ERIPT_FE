"use client";

import { useMutation } from "@tanstack/react-query";
import { CheckCircleIcon, SendIcon, XCircleIcon } from "@/components/icons";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/components/providers/session-provider";
import { api } from "@/lib/api";
import { isAdmin } from "@/lib/auth-utils";
import { isApiError } from "@/lib/errors";
import { useCoursePatcher, useSections } from "../api";
import { courseMessages as m } from "../messages";
import { StatusBadge } from "../parts";
import type { Course, CourseStatus } from "../types";
import { fmtPrice, stripHtml, totalLessons } from "../utils";

const t = m.publish;

interface Item {
  key: keyof typeof t.items;
  ok: boolean;
  required: boolean;
  tab: string;
  detail?: string;
}

export function PublishTab({ course, onGoto }: { course: Course; onGoto: (tab: string) => void }) {
  const { user } = useSession();
  const toast = useToast();
  const patch = useCoursePatcher();
  const sections = useSections(course.id);
  const lessons = sections.data ? totalLessons(sections.data) : (course.lessons_count ?? 0);

  const items: Item[] = [
    { key: "title", ok: course.title.trim().length > 0, required: true, tab: "info" },
    { key: "description", ok: stripHtml(course.description).length > 0, required: true, tab: "info" },
    { key: "lessons", ok: lessons >= 1, required: true, tab: "curriculum", detail: sections.isPending ? undefined : `${lessons}` },
    { key: "category", ok: !!course.category_id, required: false, tab: "info" },
    { key: "thumbnail", ok: !!course.thumbnail, required: false, tab: "info" },
    { key: "price", ok: course.price != null, required: false, tab: "info", detail: fmtPrice(course.price) },
  ];
  const missingRequired = items.filter((i) => i.required && !i.ok).length;
  const missingAll = items.filter((i) => !i.ok).length;

  const setStatus = useMutation({
    mutationFn: async ({ status, submit }: { status: CourseStatus; submit?: boolean }) =>
      submit ? api.post(`/courses/${course.id}/publish`) : api.put(`/courses/${course.id}`, { status }),
    onMutate: ({ status }) => {
      const prev = course.status;
      patch(course.id, { status });
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx) patch(course.id, { status: ctx.prev });
      toast.error(isApiError(e) ? e.message : m.common.loadError);
    },
    onSuccess: (_r, v) => toast.success(v.submit ? t.submitted : t.statusChanged),
  });

  const busy = setStatus.isPending;
  const s = course.status;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="rounded-xl border border-border bg-surface">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5">
          <div>
            <h2 className="text-base font-semibold">{t.checklist}</h2>
            <p className="text-sm text-muted">{missingAll === 0 ? t.checklistDone : t.checklistTodo(missingAll)}</p>
          </div>
        </header>
        <ul className="divide-y divide-border">
          {items.map((i) => (
            <li key={i.key} className="flex items-center gap-3 px-5 py-3">
              {i.ok ? <CheckCircleIcon className="size-5 shrink-0 text-success" aria-label="Đã hoàn thành" /> : <XCircleIcon className={i.required ? "size-5 shrink-0 text-danger" : "size-5 shrink-0 text-warning"} aria-label="Chưa hoàn thành" />}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t.items[i.key]}</p>
                {i.detail && <p className="text-sm text-muted">{i.detail}</p>}
              </div>
              <Badge tone={i.required ? "danger" : "neutral"}>{i.required ? t.required : t.recommended}</Badge>
              {!i.ok && <Button variant="outline" size="sm" onClick={() => onGoto(i.tab)}>{t.fix}</Button>}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4 self-start rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{t.title}</h2>
          <StatusBadge status={s} />
        </div>
        {s === "rejected" && (
          <Alert tone="danger" title={t.rejectReason}>{course.reject_reason || t.rejectedText}</Alert>
        )}
        <p className="text-sm text-muted">
          {s === "draft" && t.draftText}
          {s === "pending_review" && t.pendingText}
          {s === "published" && t.publishedText}
          {s === "closed" && t.closedText}
          {s === "rejected" && !course.reject_reason ? "" : s === "rejected" ? t.rejectedText : ""}
        </p>

        {(s === "draft" || s === "rejected") && (
          <>
            <Button className="w-full" onClick={() => setStatus.mutate({ status: "pending_review", submit: true })} disabled={missingRequired > 0 || busy} loading={busy}>
              <SendIcon className="size-4" aria-hidden /> {t.submit}
            </Button>
            <p className="text-sm text-muted">{missingRequired > 0 ? t.needsMore : t.submitHint}</p>
          </>
        )}
        {isAdmin(user) && s !== "published" && (
          <>
            <Button variant="outline" className="w-full" onClick={() => setStatus.mutate({ status: "published" })} disabled={missingRequired > 0 || busy}>
              {t.publishNow}
            </Button>
            <p className="text-sm text-muted">{t.publishNowHint}</p>
          </>
        )}
        {s === "pending_review" && (
          <Button variant="outline" className="w-full" onClick={() => setStatus.mutate({ status: "draft" })} disabled={busy}>{t.reopen}</Button>
        )}
        {s === "published" && (
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => setStatus.mutate({ status: "draft" })} disabled={busy}>{t.unpublish}</Button>
            <Button variant="outline" onClick={() => setStatus.mutate({ status: "closed" })} disabled={busy}>{t.close}</Button>
          </div>
        )}
        {s === "closed" && <Button variant="outline" className="w-full" onClick={() => setStatus.mutate({ status: "draft" })} disabled={busy}>{t.reopen}</Button>}
      </section>
    </div>
  );
}
