"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { isApiError } from "@/lib/errors";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { QueryError } from "@/components/site/query-state";
import { StarInput, Stars } from "@/components/site/rating";
import { siteMessages as t } from "./messages";
import { timeAgo } from "./format";
import type { LegacyPage, Review } from "./types";

const MAX_PAGES = 10;

async function fetchAllReviews(courseId: number): Promise<{ items: Review[]; total: number }> {
  const first = await api.get<LegacyPage<Review>>(`/courses/${courseId}/reviews`, { query: { page: 1 } });
  const pages = Math.min(first.last_page, MAX_PAGES);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, i) => api.get<LegacyPage<Review>>(`/courses/${courseId}/reviews`, { query: { page: i + 2 } })),
  );
  return { items: [first, ...rest].flatMap((p) => p.data), total: first.total };
}

function Histogram({ items, total }: { items: Review[]; total: number }) {
  const counts = [5, 4, 3, 2, 1].map((s) => items.filter((r) => r.rating === s).length);
  const max = Math.max(1, ...counts);
  const avg = items.length ? items.reduce((a, r) => a + r.rating, 0) / items.length : 0;
  return (
    <div className="grid gap-6 sm:grid-cols-[10rem_1fr] sm:items-center">
      <div className="text-center sm:text-left">
        <p className="text-5xl font-extrabold">{avg ? avg.toFixed(1) : "–"}</p>
        <Stars value={avg} size={18} className="mt-1" />
        <p className="mt-1 text-sm text-muted">{items.length < total ? t.reviews.basedOnPartial(items.length, total) : t.reviews.basedOn(total)}</p>
      </div>
      <ul aria-label={t.reviews.histogram} className="space-y-1.5">
        {[5, 4, 3, 2, 1].map((s, i) => (
          <li key={s} className="flex items-center gap-3 text-sm">
            <span className="w-12 shrink-0 text-muted">{t.reviews.star(s)}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
              <span className="block h-full rounded-full bg-warning" style={{ width: `${(counts[i] / max) * 100}%` }} />
            </span>
            <span className="w-8 shrink-0 text-right text-muted">{counts[i]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReviewForm({ initial, busy, onSubmit, onCancel }: { initial?: Review; busy: boolean; onSubmit: (rating: number, comment: string) => void; onCancel?: () => void }) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [err, setErr] = useState("");
  return (
    <form
      className="space-y-3 rounded-xl border border-border bg-surface-subtle p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!rating) return setErr(t.reviews.ratingRequired);
        setErr("");
        onSubmit(rating, comment.trim());
      }}
    >
      <p className="font-semibold">{initial ? t.reviews.yours : t.reviews.write}</p>
      <StarInput value={rating} onChange={(v) => { setRating(v); setErr(""); }} label={t.reviews.rate} />
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={2000} placeholder={t.reviews.comment} aria-label={t.reviews.comment} />
      <div className="flex gap-2">
        <Button type="submit" loading={busy}>{initial ? t.reviews.update : t.reviews.submit}</Button>
        {onCancel && <Button variant="ghost" onClick={onCancel}>Hủy</Button>}
      </div>
    </form>
  );
}

export function ReviewsPanel({
  courseId,
  userId,
  isEnrolled,
  onChanged,
}: {
  courseId: number;
  userId: number | null;
  isEnrolled: boolean;
  /** Called after a successful create/update/delete (e.g. router.refresh() for server-rendered aggregates). */
  onChanged?: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const key = useMemo(() => ["site", "reviews", courseId], [courseId]);
  const [shown, setShown] = useState(5);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const all = useQuery({ queryKey: key, queryFn: () => fetchAllReviews(courseId), staleTime: 30_000 });
  const mine = userId ? all.data?.items.find((r) => r.user_id === userId) : undefined;

  type Cache = { items: Review[]; total: number };
  const snapshot = async () => {
    await qc.cancelQueries({ queryKey: key });
    return qc.getQueryData<Cache>(key);
  };
  const rollback = (prev: Cache | undefined) => qc.setQueryData(key, prev);

  const create = useMutation({
    mutationFn: (v: { rating: number; comment: string }) => api.post<{ review: Review }>(`/courses/${courseId}/reviews`, { rating: v.rating, comment: v.comment || null }),
    onMutate: async (v) => {
      const prev = await snapshot();
      const temp: Review = { id: -1, user_id: userId ?? 0, course_id: courseId, rating: v.rating, comment: v.comment || null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user: null };
      if (prev) qc.setQueryData<Cache>(key, { items: [temp, ...prev.items], total: prev.total + 1 });
      return { prev };
    },
    onError: (e, _v, ctx) => { rollback(ctx?.prev); toast.error(isApiError(e) ? e.message : t.states.errorText); },
    onSuccess: () => { toast.success(t.reviews.saved); onChanged?.(); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
  const update = useMutation({
    mutationFn: (v: { id: number; rating: number; comment: string }) => api.put(`/courses/${courseId}/reviews/${v.id}`, { rating: v.rating, comment: v.comment || null }),
    onMutate: async (v) => {
      const prev = await snapshot();
      if (prev) qc.setQueryData<Cache>(key, { ...prev, items: prev.items.map((r) => (r.id === v.id ? { ...r, rating: v.rating, comment: v.comment || null } : r)) });
      setEditing(false);
      return { prev };
    },
    onError: (e, _v, ctx) => { rollback(ctx?.prev); toast.error(isApiError(e) ? e.message : t.states.errorText); },
    onSuccess: () => { toast.success(t.reviews.saved); onChanged?.(); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/courses/${courseId}/reviews/${id}`),
    onMutate: async (id) => {
      const prev = await snapshot();
      if (prev) qc.setQueryData<Cache>(key, { items: prev.items.filter((r) => r.id !== id), total: Math.max(0, prev.total - 1) });
      setConfirmDelete(false);
      return { prev };
    },
    onError: (e, _v, ctx) => { rollback(ctx?.prev); toast.error(isApiError(e) ? e.message : t.states.errorText); },
    onSuccess: () => { toast.success(t.reviews.deleted); onChanged?.(); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  if (all.isPending) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label={t.reviews.loading}>
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  if (all.isError) return <QueryError error={all.error} onRetry={() => all.refetch()} />;

  const { items, total } = all.data;
  const others = items.filter((r) => r.id !== mine?.id);
  return (
    <div className="space-y-6">
      {total > 0 ? <Histogram items={items} total={total} /> : <p className="text-muted">{t.course.noReviews}</p>}

      {userId && isEnrolled && !mine && <ReviewForm busy={create.isPending} onSubmit={(rating, comment) => create.mutate({ rating, comment })} />}
      {userId && !isEnrolled && !mine && <p className="text-sm text-muted">{t.reviews.needEnroll}</p>}
      {mine && editing && <ReviewForm initial={mine} busy={update.isPending} onSubmit={(rating, comment) => update.mutate({ id: mine.id, rating, comment })} onCancel={() => setEditing(false)} />}

      <ul className="divide-y divide-border">
        {(mine && !editing ? [mine, ...others] : others).slice(0, shown).map((r) => (
          <li key={r.id} className={cn("flex gap-3 py-4", r.id === -1 && "opacity-60")}>
            <Avatar name={r.user?.name ?? t.reviews.anonymous} src={r.user?.avatar} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold">{r.user?.name ?? t.reviews.anonymous}</span>
                {r.id === mine?.id && <Badge tone="primary">{t.reviews.mine}</Badge>}
                <span className="text-xs text-muted">{timeAgo(r.created_at)}</span>
              </div>
              <Stars value={r.rating} size={14} className="mt-0.5" />
              {r.comment && <p className="mt-1.5 whitespace-pre-line break-words">{r.comment}</p>}
              {r.id === mine?.id && !editing && (
                <div className="mt-2 flex gap-3 text-sm">
                  <button type="button" className="text-primary hover:underline" onClick={() => setEditing(true)}>{t.reviews.edit}</button>
                  <button type="button" className="text-danger hover:underline" onClick={() => setConfirmDelete(true)}>{t.reviews.delete}</button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      {items.length > shown && <Button variant="outline" onClick={() => setShown((n) => n + 10)}>{t.reviews.loadMore}</Button>}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => mine && remove.mutate(mine.id)}
        title={t.reviews.deleteTitle}
        description={t.reviews.deleteText}
        confirmLabel={t.reviews.delete}
        destructive
        loading={remove.isPending}
      />
    </div>
  );
}
