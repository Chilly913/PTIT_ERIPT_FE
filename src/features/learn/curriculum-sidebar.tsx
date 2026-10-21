"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { CheckCircleIcon, ChevronDownIcon, LockIcon } from "@/components/icons";
import { clock } from "@/features/site/format";
import { lessonIcon } from "@/features/site/lesson-type";
import type { FlatLesson } from "./api";
import { learnMessages as m } from "./messages";

interface Group {
  id: number;
  title: string;
  lessons: FlatLesson[];
}

export function CurriculumSidebar({
  groups,
  activeId,
  done,
  percent,
  hrefFor,
  onSelect,
  onIntent,
  accessible,
  lockedReason,
}: {
  groups: Group[];
  activeId: number | null;
  done: Set<number>;
  percent: number;
  hrefFor: (id: number) => string;
  onSelect: (id: number) => void;
  /** Hover / focus: warm the caches for that lesson. */
  onIntent: (id: number) => void;
  /** Lessons the viewer may open (enrolled: all; otherwise previews only). */
  accessible: (l: FlatLesson) => boolean;
  /** Why a lesson cannot be opened yet (schedule / sequence), undefined when it is open. */
  lockedReason?: (id: number) => string | undefined;
}) {
  const [closed, setClosed] = useState<Set<number>>(new Set());
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  const total = groups.reduce((a, g) => a + g.lessons.length, 0);
  const doneCount = groups.reduce((a, g) => a + g.lessons.filter((l) => done.has(l.id)).length, 0);

  return (
    <nav aria-label={m.curriculum} className="flex flex-col">
      <div className="border-b border-border p-4">
        <p className="font-semibold">{m.curriculum}</p>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
          aria-label={m.percentDone(Math.round(percent))}
          className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"
        >
          <div className="h-full rounded-full bg-success transition-[width] duration-300" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-muted">{m.progress(doneCount, total)} · {m.percentDone(Math.round(percent))}</p>
      </div>
      <ul>
        {groups.map((g) => {
          const isOpen = !closed.has(g.id);
          const gDone = g.lessons.filter((l) => done.has(l.id)).length;
          return (
            <li key={g.id} className="border-b border-border last:border-0">
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setClosed((s) => { const n = new Set(s); if (n.has(g.id)) n.delete(g.id); else n.add(g.id); return n; })}
                  className="flex w-full items-center gap-2 bg-surface-subtle px-4 py-2.5 text-left hover:bg-surface-muted"
                >
                  <ChevronDownIcon size={14} className={cn("shrink-0 transition-transform", !isOpen && "-rotate-90")} />
                  <span className="flex-1 text-sm font-semibold">{g.title}</span>
                  <span className="shrink-0 text-xs text-muted">{gDone}/{g.lessons.length}</span>
                </button>
              </h3>
              {isOpen && (
                <ul>
                  {g.lessons.map((l) => {
                    const Icon = lessonIcon(l.type);
                    const active = l.id === activeId;
                    const isDone = done.has(l.id);
                    const ok = accessible(l);
                    const lock = lockedReason?.(l.id);
                    return (
                      <li key={l.id}>
                        <a
                          ref={active ? activeRef : undefined}
                          href={hrefFor(l.id)}
                          aria-current={active ? "page" : undefined}
                          onMouseEnter={() => onIntent(l.id)}
                          onFocus={() => onIntent(l.id)}
                          onClick={(e) => {
                            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                            e.preventDefault();
                            onSelect(l.id);
                          }}
                          className={cn(
                            "flex items-start gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-surface-muted",
                            active && "bg-primary-soft hover:bg-primary-soft",
                            (!ok || lock) && "text-muted",
                          )}
                        >
                          <span className="mt-0.5 shrink-0" aria-hidden>
                            {lock ? <LockIcon size={16} className="text-muted" /> : isDone ? <CheckCircleIcon size={16} className="text-success" /> : <span className="block size-4 rounded-full border-2 border-border-strong" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cn("block leading-snug", active && "font-semibold text-primary-soft-foreground")}>{l.title}</span>
                            <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                              <Icon size={12} />
                              {l.duration > 0 && <span className="tabular-nums">{clock(l.duration)}</span>}
                              {l.is_preview && <span className="font-medium text-primary">{m.preview}</span>}
                              {isDone && <span className="sr-only">{m.completed}</span>}
                            </span>
                            {lock && <span className="mt-0.5 block text-xs text-muted">{lock}</span>}
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
