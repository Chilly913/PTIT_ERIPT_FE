"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { isApiError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { QueryError } from "@/components/site/query-state";
import { clock, timeAgo } from "@/features/site/format";
import type { Note } from "@/features/site/types";
import { keys } from "./api";
import { learnMessages as m } from "./messages";
import type { PlayerBridge } from "./media-player";

const draftKey = (lessonId: number) => `eript:note-draft:${lessonId}`;

function loadDraft(lessonId: number): string {
  try {
    return window.localStorage.getItem(draftKey(lessonId)) ?? "";
  } catch {
    return "";
  }
}

export function NotesTab({ course, lessonId, bridge, timestamped }: { course: string; lessonId: number; bridge: React.RefObject<PlayerBridge | null>; timestamped: boolean }) {
  const qc = useQueryClient();
  const toast = useToast();
  const key = keys.notes(course, lessonId);
  const [draft, setDraft] = useState(() => loadDraft(lessonId));
  const [attach, setAttach] = useState(timestamped);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [deleting, setDeleting] = useState<Note | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [now, setNow] = useState(0);

  const list = useQuery({ queryKey: key, queryFn: () => api.get<Note[]>(`/courses/${course}/lessons/${lessonId}/notes`), staleTime: 60_000 });

  // Debounced draft autosave (survives reloads and lesson switches).
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        if (draft) window.localStorage.setItem(draftKey(lessonId), draft);
        else window.localStorage.removeItem(draftKey(lessonId));
      } catch {
        /* ignore */
      }
    }, 500);
    return () => clearTimeout(timer.current);
  }, [draft, lessonId]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Math.floor(bridge.current?.getTime() ?? 0)), 1000);
    return () => window.clearInterval(id);
  }, [bridge]);

  type Ctx = { prev: Note[] | undefined };
  const snapshot = async (): Promise<Ctx> => {
    await qc.cancelQueries({ queryKey: key });
    return { prev: qc.getQueryData<Note[]>(key) };
  };
  const rollback = (ctx: Ctx | undefined) => qc.setQueryData(key, ctx?.prev);
  const fail = (e: unknown) => toast.error(isApiError(e) && e.message ? e.message : m.notes.saveError);

  const add = useMutation({
    mutationFn: (v: { content: string; position: number }) => api.post(`/courses/${course}/lessons/${lessonId}/notes`, { content: v.content, position_seconds: v.position }),
    onMutate: async (v): Promise<Ctx> => {
      const ctx = await snapshot();
      const temp: Note = { id: -Date.now(), lesson_id: lessonId, content: v.content, position_seconds: v.position, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      qc.setQueryData<Note[]>(key, [temp, ...(ctx.prev ?? [])]);
      setDraft("");
      return ctx;
    },
    onError: (e, v, ctx) => { rollback(ctx); setDraft(v.content); fail(e); },
    onSuccess: () => toast.success(m.notes.added),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
  const edit = useMutation({
    mutationFn: (v: { id: number; content: string }) => api.put(`/courses/${course}/lessons/${lessonId}/notes/${v.id}`, { content: v.content }),
    onMutate: async (v): Promise<Ctx> => {
      const ctx = await snapshot();
      qc.setQueryData<Note[]>(key, (ctx.prev ?? []).map((n) => (n.id === v.id ? { ...n, content: v.content } : n)));
      setEditingId(null);
      return ctx;
    },
    onError: (e, _v, ctx) => { rollback(ctx); fail(e); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/courses/${course}/lessons/${lessonId}/notes/${id}`),
    onMutate: async (id): Promise<Ctx> => {
      const ctx = await snapshot();
      qc.setQueryData<Note[]>(key, (ctx.prev ?? []).filter((n) => n.id !== id));
      setDeleting(null);
      return ctx;
    },
    onError: (e, _v, ctx) => { rollback(ctx); fail(e); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    add.mutate({ content, position: attach ? Math.floor(bridge.current?.getTime() ?? 0) : 0 });
  };

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") submit(e); }}
          rows={3}
          maxLength={5000}
          placeholder={m.notes.placeholder}
          aria-label={m.notes.placeholder}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          {timestamped ? (
            <label className="inline-flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} className="size-4 accent-(--primary)" />
              {attach ? m.notes.atTime(clock(now)) : m.notes.noTime}
            </label>
          ) : <span />}
          <Button type="submit" disabled={!draft.trim()} loading={add.isPending}>{m.notes.add}</Button>
        </div>
      </form>

      {list.isPending ? (
        <div className="space-y-2" aria-busy="true"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
      ) : list.isError ? (
        <QueryError error={list.error} onRetry={() => list.refetch()} />
      ) : list.data.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-muted">{m.notes.empty}</p>
      ) : (
        <ul className="space-y-3">
          {list.data.map((n) => (
            <li key={n.id} className={`rounded-lg border border-border bg-surface p-3 ${n.id < 0 ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                {timestamped && n.position_seconds > 0 && (
                  <button type="button" onClick={() => bridge.current?.seek(n.position_seconds)} className="rounded bg-primary-soft px-1.5 py-0.5 font-semibold text-primary-soft-foreground tabular-nums hover:bg-primary-soft-hover" aria-label={`${m.notes.jump} ${clock(n.position_seconds)}`}>
                    {clock(n.position_seconds)}
                  </button>
                )}
                <span>{timeAgo(n.created_at)}</span>
              </div>
              {editingId === n.id ? (
                <div className="mt-2 space-y-2">
                  <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} maxLength={5000} aria-label={m.notes.edit} autoFocus />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={!editText.trim()} onClick={() => edit.mutate({ id: n.id, content: editText.trim() })}>{m.notes.save}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>{m.notes.cancel}</Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-1.5 whitespace-pre-line break-words">{n.content}</p>
                  {n.id > 0 && (
                    <div className="mt-2 flex gap-3 text-sm">
                      <button type="button" className="text-primary hover:underline" onClick={() => { setEditingId(n.id); setEditText(n.content); }}>{m.notes.edit}</button>
                      <button type="button" className="text-danger hover:underline" onClick={() => setDeleting(n)}>{m.notes.delete}</button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        title={m.notes.deleteTitle}
        description={m.notes.deleteText}
        confirmLabel={m.notes.delete}
        destructive
        loading={remove.isPending}
      />
    </div>
  );
}
