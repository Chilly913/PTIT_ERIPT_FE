"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import {
  BookIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EditIcon,
  GripIcon,
  MoreHorizontalIcon,
  PlusIcon,
  TrashIcon,
  ChevronUpIcon,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { useSections } from "../api";
import { courseMessages as m } from "../messages";
import { LessonTypeIcon, LoadError } from "../parts";
import type { Lesson, Section } from "../types";
import { fmtDuration, fmtShort, totalLessons, totalSeconds } from "../utils";
import { isTemp, moveLessonBy, moveSectionBy, useCurriculumOps } from "./curriculum-ops";
import { LessonDrawer } from "./lesson-drawer";
import { SectionScheduleDialog } from "./section-schedule";

const t = m.curriculum;
const sid = (id: number) => `s:${id}`;
const lid = (id: number) => `l:${id}`;
const parse = (id: string | number) => {
  const [k, n] = String(id).split(":");
  return { kind: k === "s" ? ("section" as const) : ("lesson" as const), id: Number(n) };
};

export function CurriculumSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3"><Skeleton className="size-6" /><Skeleton className="h-5 w-56" /></div>
          <div className="space-y-2 p-3">
            {Array.from({ length: 3 }).map((__, j) => <Skeleton key={j} className="h-10 w-full" />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function InlineTitle({ value, editing, onEdit, onCommit, className, disabled }: { value: string; editing: boolean; onEdit: (on: boolean) => void; onCommit: (v: string) => void; className?: string; disabled?: boolean }) {
  if (!editing) {
    return (
      <button type="button" disabled={disabled} onDoubleClick={() => onEdit(true)} className={cn("min-w-0 truncate text-left", className)} title={m.curriculum.rename}>
        {value}
      </button>
    );
  }
  return <InlineInput value={value} onEdit={onEdit} onCommit={onCommit} />;
}

function InlineInput({ value, onEdit, onCommit }: { value: string; onEdit: (on: boolean) => void; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  const done = useRef(false);
  const commit = () => {
    if (done.current) return;
    done.current = true;
    const v = draft.trim();
    onEdit(false);
    if (v && v !== value) onCommit(v);
  };
  return (
    <input
      ref={(el) => {
        el?.focus();
        el?.select();
      }}
      value={draft}
      maxLength={255}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          e.stopPropagation();
          done.current = true;
          onEdit(false);
        }
      }}
      aria-label={t.rename}
      className="h-8 min-w-0 flex-1 rounded-md border border-border-control bg-(--input-bg) px-2 outline-none focus:outline-2 focus:outline-(--input-focus-ring)"
    />
  );
}

const LessonRow = memo(function LessonRow({
  lesson,
  editing,
  onOpen,
  onEdit,
  onRename,
  onDelete,
  onMove,
  canUp,
  canDown,
}: {
  lesson: Lesson;
  editing: boolean;
  onOpen: (id: number) => void;
  onEdit: (id: number | null) => void;
  onRename: (id: number, title: string) => void;
  onDelete: (l: Lesson) => void;
  onMove: (id: number, dir: -1 | 1) => void;
  canUp: boolean;
  canDown: boolean;
}) {
  const temp = isTemp(lesson.id);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lid(lesson.id), data: { type: "lesson" }, disabled: temp });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group flex items-center gap-2 rounded-lg border border-transparent bg-surface py-1 pr-1.5 pl-1 hover:border-border hover:bg-surface-subtle", isDragging && "opacity-40", temp && "opacity-60")}
    >
      <button type="button" disabled={temp} className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted hover:bg-surface-muted active:cursor-grabbing" aria-label={`${t.dragHandle}: ${lesson.title}`} {...attributes} {...listeners}>
        <GripIcon className="size-4" />
      </button>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-muted text-muted"><LessonTypeIcon type={lesson.type} /></span>
      {editing ? (
        <InlineTitle value={lesson.title} editing onEdit={(on) => onEdit(on ? lesson.id : null)} onCommit={(v) => onRename(lesson.id, v)} />
      ) : (
        <button type="button" disabled={temp} onClick={() => onOpen(lesson.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-label={`${m.editor.tabs.curriculum}: ${lesson.title}`}>
          <span className="truncate font-medium">{lesson.title}</span>
          <span className="hidden shrink-0 text-sm text-muted sm:inline">{m.lessonType[lesson.type] ?? lesson.type}</span>
          {lesson.is_preview && <Badge tone="info" className="hidden shrink-0 sm:inline-flex">{t.free}</Badge>}
        </button>
      )}
      <span className="hidden shrink-0 text-sm text-muted tabular-nums sm:block">{fmtDuration(lesson.duration)}</span>
      <Dropdown>
        <DropdownTrigger className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-surface-muted hover:text-foreground" aria-label={`${m.list.rowActions}: ${lesson.title}`} disabled={temp}>
          <MoreHorizontalIcon className="size-4" />
        </DropdownTrigger>
        <DropdownContent align="end">
          <DropdownItem onSelect={() => onOpen(lesson.id)}><EditIcon className="size-4" /> {m.common.edit}</DropdownItem>
          <DropdownItem onSelect={() => onEdit(lesson.id)}><EditIcon className="size-4" /> {t.rename}</DropdownItem>
          <DropdownItem disabled={!canUp} onSelect={() => onMove(lesson.id, -1)}><ChevronUpIcon className="size-4" /> {t.moveUp}</DropdownItem>
          <DropdownItem disabled={!canDown} onSelect={() => onMove(lesson.id, 1)}><ChevronDownIcon className="size-4" /> {t.moveDown}</DropdownItem>
          <DropdownSeparator />
          <DropdownItem danger onSelect={() => onDelete(lesson)}><TrashIcon className="size-4" /> {t.deleteLesson}</DropdownItem>
        </DropdownContent>
      </Dropdown>
    </li>
  );
});

function SectionBlock({
  section,
  index,
  count,
  collapsed,
  editing,
  editingLesson,
  onToggle,
  onEdit,
  onEditLesson,
  onRename,
  onSchedule,
  onDelete,
  onMove,
  onAddLesson,
  onOpenLesson,
  onRenameLesson,
  onDeleteLesson,
  onMoveLesson,
  lessonPos,
}: {
  section: Section;
  index: number;
  count: number;
  collapsed: boolean;
  editing: boolean;
  editingLesson: number | null;
  onToggle: () => void;
  onEdit: (on: boolean) => void;
  onEditLesson: (id: number | null) => void;
  onRename: (title: string) => void;
  onSchedule: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  onAddLesson: () => void;
  onOpenLesson: (id: number) => void;
  onRenameLesson: (id: number, title: string) => void;
  onDeleteLesson: (l: Lesson) => void;
  onMoveLesson: (id: number, dir: -1 | 1) => void;
  lessonPos: (id: number) => { up: boolean; down: boolean };
}) {
  const temp = isTemp(section.id);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sid(section.id), data: { type: "section" }, disabled: temp });
  const secs = section.lessons.reduce((n, l) => n + (l.duration || 0), 0);
  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("rounded-xl border border-border bg-surface", isDragging && "opacity-40", temp && "opacity-60")}
      aria-label={section.title}
    >
      <header className="flex items-center gap-2 border-b border-border px-2 py-2 pr-2.5">
        <button type="button" disabled={temp} className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted hover:bg-surface-muted active:cursor-grabbing" aria-label={`${t.dragHandle}: ${section.title}`} {...attributes} {...listeners}>
          <GripIcon className="size-4" />
        </button>
        <button type="button" onClick={onToggle} aria-expanded={!collapsed} aria-label={section.title} className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-muted">
          {collapsed ? <ChevronRightIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
        </button>
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="shrink-0 text-sm text-muted">{index + 1}.</span>
          <InlineTitle value={section.title} editing={editing} onEdit={onEdit} onCommit={onRename} className="font-semibold" disabled={temp} />
          <span className="hidden shrink-0 text-sm text-muted sm:inline">{t.lessonsCount(section.lessons.length)}{secs ? ` · ${fmtDuration(secs)}` : ""}</span>
          {(section.opens_at || section.closes_at) && (
            <Badge tone="info" className="shrink-0">
              {section.opens_at ? t.opensOn(fmtShort(section.opens_at)) : t.closesOn(fmtShort(section.closes_at as string))}
              {section.opens_at && section.closes_at ? ` · ${t.closesOn(fmtShort(section.closes_at))}` : ""}
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onAddLesson} disabled={temp}>
          <PlusIcon className="size-4" aria-hidden /> <span className="hidden sm:inline">{t.addLesson}</span>
        </Button>
        <Dropdown>
          <DropdownTrigger className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-surface-muted hover:text-foreground" aria-label={`${m.list.rowActions}: ${section.title}`} disabled={temp}>
            <MoreHorizontalIcon className="size-4" />
          </DropdownTrigger>
          <DropdownContent align="end">
            <DropdownItem onSelect={() => onEdit(true)}><EditIcon className="size-4" /> {t.rename}</DropdownItem>
            <DropdownItem onSelect={onSchedule}><ClockIcon className="size-4" /> {t.schedule}</DropdownItem>
            <DropdownItem disabled={index === 0} onSelect={() => onMove(-1)}><ChevronUpIcon className="size-4" /> {t.moveUp}</DropdownItem>
            <DropdownItem disabled={index === count - 1} onSelect={() => onMove(1)}><ChevronDownIcon className="size-4" /> {t.moveDown}</DropdownItem>
            <DropdownSeparator />
            <DropdownItem danger onSelect={onDelete}><TrashIcon className="size-4" /> {t.deleteSection}</DropdownItem>
          </DropdownContent>
        </Dropdown>
      </header>
      {!collapsed && (
        <SortableContext items={section.lessons.map((l) => lid(l.id))} strategy={verticalListSortingStrategy}>
          {section.lessons.length === 0 ? (
            <p className="m-2 rounded-lg border border-dashed border-border-control px-4 py-5 text-center text-sm text-muted">{t.emptySection}</p>
          ) : (
            <ul className="space-y-0.5 p-2">
              {section.lessons.map((l) => {
                const pos = lessonPos(l.id);
                return (
                  <LessonRow
                    key={l.id}
                    lesson={l}
                    editing={editingLesson === l.id}
                    onOpen={onOpenLesson}
                    onEdit={onEditLesson}
                    onRename={onRenameLesson}
                    onDelete={onDeleteLesson}
                    onMove={onMoveLesson}
                    canUp={pos.up}
                    canDown={pos.down}
                  />
                );
              })}
            </ul>
          )}
        </SortableContext>
      )}
    </section>
  );
}

export function CurriculumTab({ courseId, courseTitle, onOpenAssignments }: { courseId: number; courseTitle: string; onOpenAssignments?: () => void }) {
  const q = useSections(courseId);
  const ops = useCurriculumOps(courseId);
  const toast = useToast();
  const [work, setWork] = useState<Section[] | null>(null); // working copy while dragging
  const [active, setActive] = useState<{ kind: string; id: number } | null>(null);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [editingLesson, setEditingLesson] = useState<number | null>(null);
  const [openLesson, setOpenLesson] = useState<number | null>(null);
  const [delSection, setDelSection] = useState<Section | null>(null);
  const [scheduling, setScheduling] = useState<Section | null>(null);
  const [delLesson, setDelLesson] = useState<Lesson | null>(null);
  const dragStart = useRef<Section[] | null>(null);

  const sections = work ?? q.data ?? [];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const collision: CollisionDetection = useCallback((args) => {
    const type = args.active.data.current?.type;
    if (type === "section") return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => String(c.id).startsWith("s:")) });
    const hits = pointerWithin(args);
    if (hits.length) {
      const lessons = hits.filter((h) => String(h.id).startsWith("l:"));
      return lessons.length ? lessons : hits;
    }
    // No pointer (keyboard drag): prefer the nearest lesson, fall back to a (possibly empty) section.
    const byLesson = args.droppableContainers.filter((c) => String(c.id).startsWith("l:"));
    return closestCenter({ ...args, droppableContainers: byLesson.length ? byLesson : args.droppableContainers });
  }, []);

  const findSection = (list: Section[], lessonId: number) => list.findIndex((s) => s.lessons.some((l) => l.id === lessonId));

  function onDragStart(e: DragStartEvent) {
    const p = parse(e.active.id);
    setActive(p);
    dragStart.current = q.data ?? [];
    setWork(q.data ?? []);
  }

  function onDragOver(e: DragOverEvent) {
    const { active: a, over } = e;
    if (!over) return;
    const ap = parse(a.id);
    if (ap.kind !== "lesson") return;
    const op = parse(over.id);
    setWork((cur) => {
      if (!cur) return cur;
      const from = findSection(cur, ap.id);
      const to = op.kind === "lesson" ? findSection(cur, op.id) : cur.findIndex((s) => s.id === op.id);
      if (from < 0 || to < 0 || from === to) return cur;
      const next = cur.map((s) => ({ ...s, lessons: [...s.lessons] }));
      const [lesson] = next[from].lessons.splice(next[from].lessons.findIndex((l) => l.id === ap.id), 1);
      let idx = next[to].lessons.length;
      if (op.kind === "lesson") {
        const overIdx = next[to].lessons.findIndex((l) => l.id === op.id);
        const activeRect = a.rect.current.translated;
        const below = activeRect && activeRect.top > over.rect.top + over.rect.height / 2;
        idx = overIdx + (below ? 1 : 0);
      }
      next[to].lessons.splice(idx, 0, { ...lesson, section_id: next[to].id });
      return next;
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const { active: a, over } = e;
    const ap = parse(a.id);
    let next = work ?? [];
    if (over && a.id !== over.id) {
      const op = parse(over.id);
      if (ap.kind === "section" && op.kind === "section") {
        const from = next.findIndex((s) => s.id === ap.id);
        const to = next.findIndex((s) => s.id === op.id);
        if (from >= 0 && to >= 0) next = arrayMove(next, from, to);
      } else if (ap.kind === "lesson" && op.kind === "lesson") {
        const sa = findSection(next, ap.id);
        const so = findSection(next, op.id);
        if (sa >= 0 && sa === so) {
          const list = next[sa].lessons;
          const from = list.findIndex((l) => l.id === ap.id);
          const to = list.findIndex((l) => l.id === op.id);
          next = next.map((s, i) => (i === sa ? { ...s, lessons: arrayMove(list, from, to) } : s));
        }
      }
    }
    const prev = dragStart.current ?? [];
    const changed = JSON.stringify(prev.map((s) => [s.id, s.lessons.map((l) => l.id)])) !== JSON.stringify(next.map((s) => [s.id, s.lessons.map((l) => l.id)]));
    setActive(null);
    setWork(null);
    dragStart.current = null;
    if (changed) void ops.persistTree(prev, next);
  }

  function onDragCancel() {
    setActive(null);
    setWork(null);
    dragStart.current = null;
  }

  const announcements: Announcements = useMemo(
    () => ({
      onDragStart: ({ active: a }) => `${t.dragStart} ${parse(a.id).kind === "section" ? "chương" : "bài học"}`,
      onDragOver: ({ over }) => (over ? t.dragMoved : undefined),
      onDragEnd: () => t.dragDrop,
      onDragCancel: () => t.dragCancel,
    }),
    [],
  );

  const lessonPos = (id: number) => {
    const si = findSection(sections, id);
    if (si < 0) return { up: false, down: false };
    const li = sections[si].lessons.findIndex((l) => l.id === id);
    return { up: li > 0 || si > 0, down: li < sections[si].lessons.length - 1 || si < sections.length - 1 };
  };

  async function handleAddSection() {
    const id = await ops.addSection();
    if (id) setEditingSection(id);
  }
  async function handleAddLesson(sectionId: number) {
    setCollapsed((c) => {
      const n = new Set(c);
      n.delete(sectionId);
      return n;
    });
    const id = await ops.addLesson(sectionId);
    if (id) setOpenLesson(id);
  }

  if (q.isPending) return <CurriculumSkeleton />;
  if (q.isError) return <LoadError onRetry={() => void q.refetch()} />;

  const data = q.data;
  const lessonCount = totalLessons(data);
  const duration = fmtDuration(totalSeconds(data));
  const activeSection = active?.kind === "section" ? sections.find((s) => s.id === active.id) : null;
  const activeLesson = active?.kind === "lesson" ? sections.flatMap((s) => s.lessons).find((l) => l.id === active.id) : null;
  const drawerLesson = openLesson != null ? sections.flatMap((s) => s.lessons).find((l) => l.id === openLesson) ?? null : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t.title}</h2>
          <p className="text-sm text-muted">{t.totalSummary(data.length, lessonCount, duration)}</p>
        </div>
        <Button onClick={() => void handleAddSection()}>
          <PlusIcon className="size-4" aria-hidden /> {t.addSection}
        </Button>
      </div>
      <p className="mb-3 text-sm text-muted">{t.dndHint}</p>

      {data.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface">
          <EmptyState icon={<BookIcon />} title={t.emptyTitle} description={t.emptyText} action={<Button onClick={() => void handleAddSection()}><PlusIcon className="size-4" aria-hidden /> {t.addSection}</Button>} />
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={onDragCancel} accessibility={{ announcements }}>
          <SortableContext items={sections.map((s) => sid(s.id))} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {sections.map((s, i) => (
                <SectionBlock
                  key={s.id}
                  section={s}
                  index={i}
                  count={sections.length}
                  collapsed={collapsed.has(s.id)}
                  editing={editingSection === s.id}
                  editingLesson={editingLesson}
                  onToggle={() => setCollapsed((c) => { const n = new Set(c); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; })}
                  onEdit={(on) => setEditingSection(on ? s.id : null)}
                  onEditLesson={setEditingLesson}
                  onRename={(title) => ops.renameSection(s.id, title)}
                  onSchedule={() => setScheduling(s)}
                  onDelete={() => (s.lessons.length ? toast.error(t.sectionNotEmpty) : setDelSection(s))}
                  onMove={(dir) => { const next = moveSectionBy(data, s.id, dir); if (next) void ops.persistTree(data, next); }}
                  onAddLesson={() => void handleAddLesson(s.id)}
                  onOpenLesson={setOpenLesson}
                  onRenameLesson={ops.renameLesson}
                  onDeleteLesson={setDelLesson}
                  onMoveLesson={(id, dir) => { const next = moveLessonBy(data, id, dir); if (next) void ops.persistTree(data, next); }}
                  lessonPos={lessonPos}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 120 }}>
            {activeSection ? (
              <div className="rounded-xl border border-border-strong bg-surface px-4 py-3 font-semibold shadow-(--menu-shadow)">{activeSection.title}</div>
            ) : activeLesson ? (
              <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface px-3 py-2 font-medium shadow-(--menu-shadow)">
                <LessonTypeIcon type={activeLesson.type} className="text-muted" /> {activeLesson.title}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {scheduling && <SectionScheduleDialog section={scheduling} onClose={() => setScheduling(null)} onSaved={(v) => ops.scheduleSection(scheduling.id, v)} />}
      <ConfirmDialog
        open={!!delSection}
        onClose={() => setDelSection(null)}
        destructive
        title={t.deleteSectionTitle}
        description={delSection ? t.deleteSectionText(delSection.title) : undefined}
        confirmLabel={m.common.delete}
        onConfirm={() => { if (delSection) ops.deleteSection(delSection.id); setDelSection(null); }}
      />
      <ConfirmDialog
        open={!!delLesson}
        onClose={() => setDelLesson(null)}
        destructive
        title={t.deleteLessonTitle}
        description={delLesson ? t.deleteLessonText(delLesson.title) : undefined}
        confirmLabel={m.common.delete}
        onConfirm={() => {
          if (delLesson) {
            if (openLesson === delLesson.id) setOpenLesson(null);
            ops.deleteLesson(delLesson.id);
          }
          setDelLesson(null);
        }}
      />

      <LessonDrawer courseId={courseId} courseTitle={courseTitle} lesson={drawerLesson} onClose={() => setOpenLesson(null)} ops={ops} onOpenAssignments={onOpenAssignments} />
    </div>
  );
}
