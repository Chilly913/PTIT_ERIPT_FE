"use client";

import { useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { isApiError } from "@/lib/errors";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { QueryError } from "@/components/site/query-state";
import { MessageIcon } from "@/components/icons";
import { ReplyIcon, ThumbsDownIcon, ThumbsUpIcon } from "@/components/icons/icons-learn";
import { timeAgo } from "@/features/site/format";
import type { LegacyPage, Qa, QaReaction, QaReply } from "@/features/site/types";
import { keys } from "./api";
import { learnMessages as m } from "./messages";

type Pages = InfiniteData<LegacyPage<Qa>, number>;

function applyReaction(r: QaReaction, kind: "like" | "dislike"): QaReaction {
  const next = { ...r };
  if (r.my_reaction === kind) {
    next.my_reaction = null;
    if (kind === "like") next.like_count--;
    else next.dislike_count--;
  } else {
    if (r.my_reaction === "like") next.like_count--;
    if (r.my_reaction === "dislike") next.dislike_count--;
    next.my_reaction = kind;
    if (kind === "like") next.like_count++;
    else next.dislike_count++;
  }
  return next;
}

function ReactionButtons({ state, onReact, label }: { state: QaReaction; onReact: (k: "like" | "dislike") => void; label: string }) {
  const btn = (kind: "like" | "dislike", Icon: typeof ThumbsUpIcon, count: number, text: string) => (
    <button
      type="button"
      aria-pressed={state.my_reaction === kind}
      aria-label={`${text} (${count})${label ? ` - ${label}` : ""}`}
      onClick={() => onReact(kind)}
      className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors hover:bg-surface-muted", state.my_reaction === kind ? "font-semibold text-primary" : "text-muted")}
    >
      <Icon size={14} className={state.my_reaction === kind ? "fill-current" : ""} />
      {count}
    </button>
  );
  return (
    <span className="inline-flex items-center gap-1">
      {btn("like", ThumbsUpIcon, state.like_count, m.qa.like)}
      {btn("dislike", ThumbsDownIcon, state.dislike_count, m.qa.dislike)}
    </span>
  );
}

export function QaTab({ course, courseId, lessonId, instructorId, userId }: { course: string; courseId: number; lessonId: number; instructorId: number; userId: number }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [scope, setScope] = useState<"lesson" | "course">("lesson");
  const [asking, setAsking] = useState(false);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [openReply, setOpenReply] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const scopeKey = scope === "lesson" ? `lesson-${lessonId}` : "course";
  const key = keys.qa(course, scopeKey);

  const list = useInfiniteQuery({
    queryKey: key,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.get<LegacyPage<Qa>>(`/courses/${course}/qas`, { query: { page: pageParam, lesson_id: scope === "lesson" ? lessonId : undefined } }),
    getNextPageParam: (last) => (last.current_page < last.last_page ? last.current_page + 1 : undefined),
    staleTime: 30_000,
  });

  const mapQa = (fn: (q: Qa) => Qa) => (old: Pages | undefined): Pages | undefined =>
    old && { ...old, pages: old.pages.map((p) => ({ ...p, data: p.data.map(fn) })) };

  const fail = (e: unknown, fallback: string) => toast.error(isApiError(e) && e.message ? e.message : fallback);

  const ask = useMutation({
    mutationFn: () => api.post<Qa>(`/courses/${course}/qas`, { lesson_id: lessonId, subject: subject.trim(), content: content.trim() }),
    onSuccess: () => {
      toast.success(m.qa.posted);
      setSubject("");
      setContent("");
      setAsking(false);
      void qc.invalidateQueries({ queryKey: ["learn", "qa", course] });
    },
    onError: (e) => fail(e, m.qa.postError),
  });

  const reply = useMutation({
    mutationFn: (v: { qaId: number; text: string }) => api.post<QaReply>(`/courses/${course}/qas/${v.qaId}/replies`, { content: v.text }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Pages>(key);
      const temp: QaReply = { id: -Date.now(), course_qa_id: v.qaId, user_id: userId, content: v.text, created_at: new Date().toISOString(), user: null, like_count: 0, dislike_count: 0, my_reaction: null };
      qc.setQueryData<Pages>(key, mapQa((q) => (q.id === v.qaId ? { ...q, replies: [...q.replies, temp] } : q)));
      setReplyText("");
      return { prev, text: v.text };
    },
    onError: (e, _v, ctx) => { qc.setQueryData(key, ctx?.prev); setReplyText(ctx?.text ?? ""); fail(e, m.qa.postError); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  const react = useMutation({
    mutationFn: (v: { type: "qa" | "reply"; id: number; kind: "like" | "dislike" }) =>
      api.post<QaReaction>(`/courses/${courseId}/qa-reactions`, { reactable_type: v.type, reactable_id: v.id, kind: v.kind }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Pages>(key);
      qc.setQueryData<Pages>(
        key,
        mapQa((q) =>
          v.type === "qa"
            ? q.id === v.id ? { ...q, ...applyReaction(q, v.kind) } : q
            : { ...q, replies: q.replies.map((r) => (r.id === v.id ? { ...r, ...applyReaction(r, v.kind) } : r)) },
        ),
      );
      return { prev };
    },
    onError: (e, _v, ctx) => { qc.setQueryData(key, ctx?.prev); fail(e, m.qa.postError); },
    onSuccess: (state, v) => {
      // Reconcile with the authoritative counts.
      qc.setQueryData<Pages>(
        key,
        mapQa((q) =>
          v.type === "qa"
            ? q.id === v.id ? { ...q, ...state } : q
            : { ...q, replies: q.replies.map((r) => (r.id === v.id ? { ...r, ...state } : r)) },
        ),
      );
    },
  });

  const items = list.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Phạm vi" className="inline-flex rounded-lg border border-border bg-surface p-0.5">
          {([["lesson", m.qa.thisLesson], ["course", m.qa.allCourse]] as const).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={scope === k} onClick={() => setScope(k)} className={cn("rounded-md px-3 py-1 text-sm", scope === k ? "bg-primary-soft font-semibold text-primary-soft-foreground" : "text-muted hover:text-foreground")}>
              {label}
            </button>
          ))}
        </div>
        {!asking && <Button onClick={() => setAsking(true)}><MessageIcon size={16} />{m.qa.ask}</Button>}
      </div>

      {asking && (
        <form
          className="space-y-3 rounded-xl border border-border bg-surface-subtle p-4"
          onSubmit={(e) => { e.preventDefault(); if (subject.trim() && content.trim()) ask.mutate(); }}
        >
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={255} placeholder={m.qa.subject} aria-label={m.qa.subject} autoFocus />
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} placeholder={m.qa.content} aria-label={m.qa.content} />
          <div className="flex gap-2">
            <Button type="submit" loading={ask.isPending} disabled={!subject.trim() || !content.trim()}>{m.qa.post}</Button>
            <Button variant="ghost" onClick={() => setAsking(false)}>Hủy</Button>
          </div>
        </form>
      )}

      {list.isPending ? (
        <div className="space-y-3" aria-busy="true">{[0, 1].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : list.isError ? (
        <QueryError error={list.error} onRetry={() => list.refetch()} />
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-muted">{m.qa.empty}</p>
      ) : (
        <ul className="space-y-4">
          {items.map((q) => (
            <li key={q.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex gap-3">
                <Avatar name={q.user?.name} src={q.user?.avatar} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                    <span className="font-semibold">{q.user?.name ?? "Học viên"}</span>
                    {q.user_id === instructorId && <Badge tone="primary">{m.qa.instructorTag}</Badge>}
                    <Badge>{q.lesson_id ? m.qa.lessonTag : m.qa.courseTag}</Badge>
                    <span className="text-xs text-muted">{timeAgo(q.created_at)}</span>
                  </div>
                  <h4 className="mt-1 font-semibold">{q.subject}</h4>
                  <p className="mt-1 whitespace-pre-line break-words">{q.content}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <ReactionButtons state={q} label={q.subject} onReact={(kind) => react.mutate({ type: "qa", id: q.id, kind })} />
                    <button type="button" className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted hover:bg-surface-muted" onClick={() => { setOpenReply(openReply === q.id ? null : q.id); setReplyText(""); }}>
                      <ReplyIcon size={14} />{q.replies.length ? m.qa.replies(q.replies.length) : m.qa.reply}
                    </button>
                  </div>

                  {q.replies.length > 0 && (
                    <ul className="mt-3 space-y-3 border-l-2 border-border pl-4">
                      {q.replies.map((r) => (
                        <li key={r.id} className={cn("flex gap-2.5", r.id < 0 && "opacity-60")}>
                          <Avatar name={r.user?.name} src={r.user?.avatar} size="sm" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 text-sm">
                              <span className="font-semibold">{r.user?.name ?? "Bạn"}</span>
                              {r.user_id === instructorId && <Badge tone="primary">{m.qa.instructorTag}</Badge>}
                              <span className="text-xs text-muted">{timeAgo(r.created_at)}</span>
                            </div>
                            <p className="whitespace-pre-line break-words">{r.content}</p>
                            {r.id > 0 && <ReactionButtons state={r} label="" onReact={(kind) => react.mutate({ type: "reply", id: r.id, kind })} />}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {openReply === q.id && (
                    <form
                      className="mt-3 flex gap-2"
                      onSubmit={(e) => { e.preventDefault(); if (replyText.trim()) reply.mutate({ qaId: q.id, text: replyText.trim() }); }}
                    >
                      <Input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={m.qa.replyPlaceholder} aria-label={m.qa.replyPlaceholder} autoFocus />
                      <Button type="submit" disabled={!replyText.trim()} loading={reply.isPending}>{m.qa.send}</Button>
                    </form>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {list.hasNextPage && <Button variant="outline" loading={list.isFetchingNextPage} onClick={() => list.fetchNextPage()}>{m.qa.loadMore}</Button>}
    </div>
  );
}
