"use client";

import { useEffect, useId, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { vi } from "react-day-picker/locale";
import "react-day-picker/style.css";
import { CalendarIcon, XIcon } from "@/components/icons";
import { cn } from "@/lib/cn";
import { Button } from "./button";
import { controlBase, useFieldProps } from "./field";

export interface DateTimePickerProps {
  /** "YYYY-MM-DDTHH:mm" (same as <input type="datetime-local">), "YYYY-MM-DD" in date mode, or "". */
  value: string;
  onChange: (v: string) => void;
  mode?: "datetime" | "date";
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

function parse(v: string): { date: Date; h: number; m: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(v);
  if (!m) return null;
  return { date: new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])), h: Number(m[4] ?? 0), m: Number(m[5] ?? 0) };
}
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const show = (v: string, mode: "datetime" | "date") => {
  const p = parse(v);
  if (!p) return "";
  const day = `${pad(p.date.getDate())}/${pad(p.date.getMonth() + 1)}/${p.date.getFullYear()}`;
  return mode === "date" ? day : `${day} ${pad(p.h)}:${pad(p.m)}`;
};

// react-day-picker reads its colours from these variables: map them to the app tokens.
const rdpVars = {
  "--rdp-accent-color": "var(--primary)",
  "--rdp-accent-background-color": "var(--primary-soft)",
  "--rdp-today-color": "var(--primary)",
  "--rdp-day_button-height": "2.25rem",
  "--rdp-day_button-width": "2.25rem",
  "--rdp-day-height": "2.25rem",
  "--rdp-day-width": "2.25rem",
  "--rdp-font-family": "inherit",
} as React.CSSProperties;

/** Calendar popover (react-day-picker) with an optional hour/minute selector. Drop-in for datetime-local inputs. */
export function DateTimePicker({ value, onChange, mode = "datetime", placeholder, disabled, className, ...rest }: DateTimePickerProps) {
  const f = useFieldProps();
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const cur = parse(value);
  const [month, setMonth] = useState<Date>(cur?.date ?? new Date());

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const emit = (d: Date, h: number, m: number) => onChange(mode === "date" ? ymd(d) : `${ymd(d)}T${pad(h)}:${pad(m)}`);
  const text = show(value, mode);

  return (
    <div ref={root} className={cn("relative", className)}>
      <button
        type="button"
        id={f?.id}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={rest["aria-label"]}
        onClick={() => {
          if (!open) setMonth(cur?.date ?? new Date());
          setOpen((o) => !o);
        }}
        className={cn(controlBase, "flex h-9 w-full items-center justify-between gap-2 pr-2.5 text-left disabled:cursor-not-allowed disabled:opacity-60")}
      >
        <span className={cn("min-w-0 flex-1 truncate", !text && "text-muted")}>{text || placeholder || (mode === "date" ? "Chọn ngày" : "Chọn ngày giờ")}</span>
        {text && !disabled && (
          <span role="button" tabIndex={-1} aria-label="Xóa" className="rounded p-0.5 text-muted hover:bg-surface-muted hover:text-foreground" onClick={(e) => { e.stopPropagation(); onChange(""); }}>
            <XIcon className="size-3.5" aria-hidden />
          </span>
        )}
        <CalendarIcon className="size-4 shrink-0 text-muted" aria-hidden />
      </button>
      {open && (
        <div id={id} role="dialog" aria-label="Chọn ngày giờ" className="absolute z-50 mt-1.5 w-max max-w-[calc(100vw-2rem)] rounded-lg border border-(--menu-border) bg-(--menu-bg) p-3 shadow-(--menu-shadow) animate-[pop-in_0.1s_ease-out]">
          <DayPicker
            style={rdpVars}
            mode="single"
            locale={vi}
            weekStartsOn={1}
            month={month}
            onMonthChange={setMonth}
            selected={cur?.date}
            onSelect={(d) => {
              if (!d) return;
              emit(d, cur?.h ?? 8, cur?.m ?? 0);
              if (mode === "date") setOpen(false);
            }}
            captionLayout="dropdown"
            startMonth={new Date(2020, 0)}
            endMonth={new Date(2040, 11)}
          />
          {mode === "datetime" && (
            <div className="mt-2 flex items-center gap-2 border-t border-border pt-3">
              <span className="text-sm text-muted">Giờ</span>
              <select aria-label="Giờ" disabled={!cur} value={cur?.h ?? 0} onChange={(e) => cur && emit(cur.date, Number(e.target.value), cur.m)} className={cn(controlBase, "h-8 w-16 px-2")}>
                {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{pad(i)}</option>)}
              </select>
              <span aria-hidden>:</span>
              <select aria-label="Phút" disabled={!cur} value={cur ? Math.floor(cur.m / 5) * 5 : 0} onChange={(e) => cur && emit(cur.date, cur.h, Number(e.target.value))} className={cn(controlBase, "h-8 w-16 px-2")}>
                {Array.from({ length: 12 }, (_, i) => i * 5).map((i) => <option key={i} value={i}>{pad(i)}</option>)}
              </select>
              {!cur && <span className="text-xs text-muted">Chọn ngày trước</span>}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => { const n = new Date(); emit(n, mode === "date" ? 0 : n.getHours(), mode === "date" ? 0 : Math.floor(n.getMinutes() / 5) * 5); setMonth(n); }}>Hôm nay</Button>
            <Button size="sm" onClick={() => setOpen(false)}>Xong</Button>
          </div>
        </div>
      )}
    </div>
  );
}
