"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDownIcon, ChevronUpIcon, GripIcon, PlusIcon, XIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { courseMessages as m } from "@/features/courses/messages";
import { cn } from "@/lib/cn";

export interface ListItem {
  id: string;
  text: string;
}

let seq = 0;
export const newItemId = () => `li-${Date.now().toString(36)}-${++seq}`;
export const toItems = (list: string[] | null | undefined): ListItem[] => (list ?? []).map((text) => ({ id: newItemId(), text }));
export const fromItems = (items: ListItem[]): string[] => items.map((i) => i.text.trim()).filter(Boolean);

function Row({
  item,
  index,
  count,
  onText,
  onRemove,
  onMove,
  placeholder,
}: {
  item: ListItem;
  index: number;
  count: number;
  onText: (t: string) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  placeholder: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-1.5 rounded-lg bg-surface", isDragging && "relative z-10 shadow-(--menu-shadow)")}
    >
      <button
        type="button"
        className="flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted hover:bg-surface-muted active:cursor-grabbing"
        aria-label={`${m.curriculum.dragHandle} (${index + 1})`}
        {...attributes}
        {...listeners}
      >
        <GripIcon className="size-4" />
      </button>
      <Input value={item.text} onChange={(e) => onText(e.target.value)} placeholder={placeholder} aria-label={`${placeholder} ${index + 1}`} className="flex-1" />
      <Button variant="ghost" size="icon" className="size-8" disabled={index === 0} onClick={() => onMove(-1)} aria-label={m.info.moveUp}>
        <ChevronUpIcon className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" className="size-8" disabled={index === count - 1} onClick={() => onMove(1)} aria-label={m.info.moveDown}>
        <ChevronDownIcon className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" className="size-8" onClick={onRemove} aria-label={m.info.removeRow}>
        <XIcon className="size-4" />
      </Button>
    </li>
  );
}

/** Editable string list with drag reorder, up/down buttons (keyboard) and remove. */
export function EditableList({ items, onChange, placeholder = m.info.listPlaceholder }: { items: ListItem[]; onChange: (items: ListItem[]) => void; placeholder?: string }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    if (from >= 0 && to >= 0) onChange(arrayMove(items, from, to));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    onChange(arrayMove(items, i, j));
  }

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1.5">
              {items.map((it, i) => (
                <Row
                  key={it.id}
                  item={it}
                  index={i}
                  count={items.length}
                  placeholder={placeholder}
                  onText={(t) => onChange(items.map((x) => (x.id === it.id ? { ...x, text: t } : x)))}
                  onRemove={() => onChange(items.filter((x) => x.id !== it.id))}
                  onMove={(d) => move(i, d)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      <Button variant="outline" size="sm" onClick={() => onChange([...items, { id: newItemId(), text: "" }])}>
        <PlusIcon className="size-4" aria-hidden /> {m.info.listAdd}
      </Button>
    </div>
  );
}
