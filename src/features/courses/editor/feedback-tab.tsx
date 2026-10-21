"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageIcon, StarIcon } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/components/providers/session-provider";
import { api } from "@/lib/api";
import { isApiError } from "@/lib/errors";
import type { Paginated } from "@/lib/types";
import { isNotReady, useQas, useReviews } from "../api";
import { courseMessages as m } from "../messages";
import { LoadError, NotReady } from "../parts";
import type { Course, Qa, QaReply } from "../types";
import { fmtRelative } from "../utils";

const t = m.feedback;

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${value}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} className={i <= value ? "size-4 fill-current text-warning" : "size-4 text-border-strong"} />
      ))}
    </span>
  );
}

function ListSkeleton() {
  return (
    <div className="divide-y divide-border" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-3 p-4"><Skeleton className="size-8 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-3/4" /></div></div>
      ))}
    </div>
  );
}

function Reviews({ course }: { course: Course }) {
  const [page, setPage] = useState(1);
  const q = useReviews(course.id, page);
  if (q.isError && isNotReady(q.error)) return <NotReady />;
  const avg = course.avg_rating ?? course.reviews_avg_rating;
  return (
    <div className="rounded-xl border border-border bg-surface">
      {avg != null && (course.reviews_count ?? 0) > 0 && (
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span className="text-3xl font-bold tabular-nums">{avg.toFixed(1)}</span>
          <div>
            <Stars value={Math.round(avg)} />
            <p className="text-sm text-muted">{t.average} · {course.reviews_count} {t.reviews.toLowerCase()}</p>
          </div>
        </div>
      )}
      {q.isPending ? (
        <ListSkeleton />
      ) : q.isError ? (
        <LoadError onRetry={() => void q.refetch()} />
      ) : q.data.data.length === 0 ? (
        <EmptyState icon={<StarIcon />} title={t.reviewsEmpty} description={t.reviewsEmptyText} />
      ) : (
        <ul className="divide-y divide-border">
          {q.data.data.map((r) => (
            <li key={r.id} className="flex gap-3 px-5 py-4">
              <Avatar name={r.user?.name ?? t.anonymous} src={r.user?.avatar} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  <span className="font-medium">{r.user?.name ?? t.anonymous}</span>
                  <Stars value={r.rating} />
                  <span className="text-sm text-muted">{fmtRelative(r.created_at)}</span>
                </div>
                {r.comment && <p className="mt-1 whitespace-pre-line">{r.comment}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Pagination meta={q.data?.meta} onPageChange={setPage} disabled={q.isFetching} />
    </div>
  );
}

function ReplyForm({ course, qa, page }: { course: Course; qa: Qa; page: number }) {
  const { user } = useSession();
  const qc = useQueryClient();
  const toast = useToast();
  const [text, setText] = useState("");
  const key = ["studio", "qas", String(course.id), page] as const;

  const send = useMutation({
    mutationFn: (content: string) => api.post<QaReply>(`/courses/${course.id}/qas/${qa.id}/replies`, { content }),
    onMutate: async (content) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Paginated<Qa>>(key);
      const temp: QaReply = { id: -Date.now(), user_id: user.id, content, created_at: new Date().toISOString(), user: { id: user.id, name: user.name, avatar: user.avatar } };
      qc.setQueryData<Paginated<Qa>>(key, (l) => (l ? { ...l, data: l.data.map((x) => (x.id === qa.id ? { ...x, replies: [...x.replies, temp] } : x)) } : l));
      setText("");
      return { prev, content };
    },
    onError: (e, _c, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      setText(ctx?.content ?? "");
      toast.error(isApiError(e) ? e.message : m.common.loadError);
    },
    onSuccess: () => toast.success(t.replySent),
    onSettled: () => void qc.invalidateQueries({ queryKey: key }),
  });

  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) send.mutate(text.trim());
      }}
    >
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder={t.replyPlaceholder} aria-label={t.reply} />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={!text.trim()}>{t.send}</Button>
      </div>
    </form>
  );
}

function QaInbox({ course }: { course: Course }) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "open">("all");
  const [openId, setOpenId] = useState<number | null>(null);
  const q = useQas(course.id, page);
  if (q.isError && isNotReady(q.error)) return <NotReady />;

  const answered = (x: Qa) => x.replies.some((r) => r.user_id === course.user_id);
  const rows = (q.data?.data ?? []).filter((x) => (filter === "open" ? !answered(x) : true));

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3" role="group" aria-label="Lọc câu hỏi">
        {(["all", "open"] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${filter === f ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border text-muted hover:bg-surface-muted"}`}
          >
            {f === "all" ? t.filterAll : t.unanswered}
          </button>
        ))}
      </div>
      {q.isPending ? (
        <ListSkeleton />
      ) : q.isError ? (
        <LoadError onRetry={() => void q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={<MessageIcon />} title={filter === "open" ? t.qaEmpty : t.qaEmpty} description={t.qaEmptyText} />
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((x) => {
            const open = openId === x.id;
            const done = answered(x);
            return (
              <li key={x.id} className="px-5 py-4">
                <button type="button" className="flex w-full items-start gap-3 text-left" onClick={() => setOpenId(open ? null : x.id)} aria-expanded={open}>
                  <Avatar name={x.user?.name ?? t.anonymous} src={x.user?.avatar} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{x.subject}</span>
                      <Badge tone={done ? "success" : "warning"}>{done ? t.answered : t.unanswered}</Badge>
                    </div>
                    <p className="text-sm text-muted">{x.user?.name ?? t.anonymous} · {fmtRelative(x.created_at)} · {t.replies(x.replies.length)}</p>
                    {!open && <p className="mt-1 line-clamp-2 text-sm">{x.content}</p>}
                  </div>
                </button>
                {open && (
                  <div className="mt-3 ml-11 space-y-3">
                    <p className="whitespace-pre-line">{x.content}</p>
                    {x.replies.map((r) => (
                      <div key={r.id} className="flex gap-2.5 rounded-lg bg-surface-subtle p-3">
                        <Avatar name={r.user?.name ?? t.anonymous} src={r.user?.avatar} size="sm" />
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-medium">{r.user?.name ?? t.anonymous}</span>
                            {r.user_id === course.user_id && <Badge tone="primary">{t.instructorBadge}</Badge>}
                            <span className="text-muted">{fmtRelative(r.created_at)}</span>
                          </p>
                          <p className="mt-0.5 whitespace-pre-line">{r.content}</p>
                        </div>
                      </div>
                    ))}
                    <ReplyForm course={course} qa={x} page={page} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Pagination meta={q.data?.meta} onPageChange={(p) => { setPage(p); setOpenId(null); }} disabled={q.isFetching} />
    </div>
  );
}

export function FeedbackTab({ course }: { course: Course }) {
  const [sub, setSub] = useState<"qa" | "reviews">("qa");
  return (
    <div>
      <div className="mb-4 inline-flex rounded-lg border border-border bg-surface p-0.5" role="tablist" aria-label={m.editor.tabs.feedback}>
        {(["qa", "reviews"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={sub === k}
            onClick={() => setSub(k)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${sub === k ? "bg-primary-soft text-primary-soft-foreground" : "text-muted hover:text-foreground"}`}
          >
            {k === "qa" ? t.qa : t.reviews}
          </button>
        ))}
      </div>
      {sub === "qa" ? <QaInbox course={course} /> : <Reviews course={course} />}
    </div>
  );
}
