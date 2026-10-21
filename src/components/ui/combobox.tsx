"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon, SearchIcon, XIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { controlBase, useFieldProps } from "./field";

export interface ComboOption {
  value: string;
  label: string;
  /** Secondary text shown under the label (also searchable). */
  hint?: string;
}

interface Common {
  options: ComboOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  "aria-label"?: string;
}
export type ComboboxProps = Common &
  (
    | { multiple?: false; value: string; onChange: (v: string) => void; clearLabel?: string }
    | { multiple: true; value: string[]; onChange: (v: string[]) => void; clearLabel?: string }
  );

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

/**
 * Searchable dropdown (select2 style). Single mode picks one option; `multiple` shows a checkbox per option and
 * keeps the list open so several can be ticked at once. Search ignores case and Vietnamese diacritics.
 */
export function Combobox(props: ComboboxProps) {
  const { options, placeholder = "Chọn...", searchPlaceholder = "Tìm kiếm...", emptyText = "Không có kết quả", disabled, loading, className } = props;
  const f = useFieldProps();
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const selected = useMemo(() => new Set(props.multiple ? props.value : props.value ? [props.value] : []), [props.multiple, props.value]);
  const shown = useMemo(() => {
    const term = norm(q.trim());
    return term ? options.filter((o) => norm(`${o.label} ${o.hint ?? ""}`).includes(term)) : options;
  }, [options, q]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    searchRef.current?.focus();
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    setQ("");
    setActive(0);
  };
  const pick = (o: ComboOption) => {
    if (props.multiple) {
      const next = new Set(selected);
      if (next.has(o.value)) next.delete(o.value);
      else next.add(o.value);
      props.onChange(options.filter((x) => next.has(x.value)).map((x) => x.value));
    } else {
      props.onChange(o.value);
      close();
    }
  };

  let label: React.ReactNode = <span className="text-muted">{loading ? "Đang tải..." : placeholder}</span>;
  if (props.multiple && props.value.length) {
    const first = options.find((o) => o.value === props.value[0])?.label ?? props.value[0];
    label = props.value.length === 1 ? first : `${first} và ${props.value.length - 1} mục khác`;
  } else if (!props.multiple && props.value) {
    label = options.find((o) => o.value === props.value)?.label ?? props.value;
  }
  const hasValue = props.multiple ? props.value.length > 0 : !!props.value;

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        type="button"
        id={f?.id}
        disabled={disabled || loading}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={props["aria-label"]}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(controlBase, "flex h-9 w-full items-center justify-between gap-2 pr-2.5 text-left disabled:cursor-not-allowed disabled:opacity-60")}
      >
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {hasValue && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            aria-label={props.clearLabel ?? "Bỏ chọn"}
            className="rounded p-0.5 text-muted hover:bg-surface-muted hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              if (props.multiple) props.onChange([]);
              else props.onChange("");
            }}
          >
            <XIcon className="size-3.5" aria-hidden />
          </span>
        )}
        <ChevronDownIcon className="size-4 shrink-0 text-muted" aria-hidden />
      </button>
      {open && (
        <div className="absolute z-50 mt-1.5 w-full min-w-56 rounded-lg border border-(--menu-border) bg-(--menu-bg) shadow-(--menu-shadow) animate-[pop-in_0.1s_ease-out]">
          <div className="relative border-b border-border p-2">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-4.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, shown.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (shown[active]) pick(shown[active]);
                } else if (e.key === "Escape" || e.key === "Tab") {
                  close();
                }
              }}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-8 w-full rounded-md border border-border bg-surface pr-2 pl-8 text-sm outline-none focus:border-primary"
            />
          </div>
          {props.multiple && (
            <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-xs text-muted">
              <span>{selected.size} đã chọn</span>
              <span className="flex gap-3">
                <button type="button" className="hover:text-foreground" onClick={() => props.onChange(options.map((o) => o.value))}>Chọn tất cả</button>
                <button type="button" className="hover:text-foreground" onClick={() => props.onChange([])}>Bỏ chọn</button>
              </span>
            </div>
          )}
          <ul id={id} role="listbox" aria-multiselectable={props.multiple || undefined} className="max-h-64 overflow-y-auto p-1">
            {shown.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted">{emptyText}</li>
            ) : (
              shown.map((o, i) => {
                const on = selected.has(o.value);
                return (
                  <li
                    key={o.value}
                    role="option"
                    aria-selected={on}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(o)}
                    className={cn("flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm", i === active && "bg-(--menu-item-hover)", !props.multiple && on && "font-medium text-primary")}
                  >
                    {props.multiple && (
                      <span className={cn("grid size-4 shrink-0 place-items-center rounded border", on ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-surface")} aria-hidden>
                        {on && <CheckIcon className="size-3" />}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{o.label}</span>
                      {o.hint && <span className="block truncate text-xs text-muted">{o.hint}</span>}
                    </span>
                    {!props.multiple && on && <CheckIcon className="size-4 shrink-0" aria-hidden />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
