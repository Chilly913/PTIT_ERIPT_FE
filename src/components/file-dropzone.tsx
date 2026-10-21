"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Drag-and-drop / click-to-pick area for a single file. Keyboard accessible (the native
 * file input is focusable), validates type and size, and exposes drag state for styling.
 */
export function FileDropzone({
  accept,
  maxBytes,
  disabled,
  onFile,
  onReject,
  className,
  label,
  children,
}: {
  /** MIME types and/or extensions, as for <input accept>: "image/png,.csv". */
  accept: string;
  maxBytes: number;
  disabled?: boolean;
  onFile: (file: File) => void;
  onReject?: (reason: string) => void;
  className?: string;
  /** Accessible name of the file input. */
  label: string;
  children: (state: { dragging: boolean }) => React.ReactNode;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);

  const allowed = accept.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const matches = (f: File) =>
    allowed.some((a) => (a.startsWith(".") ? f.name.toLowerCase().endsWith(a) : a.endsWith("/*") ? f.type.startsWith(a.slice(0, -1)) : f.type === a));

  const take = (f: File | undefined) => {
    if (!f || disabled) return;
    if (!matches(f)) return onReject?.("Định dạng tệp không được hỗ trợ.");
    if (f.size > maxBytes) return onReject?.(`Tệp quá lớn (tối đa ${Math.round(maxBytes / 1024 / 1024)} MB).`);
    onFile(f);
  };

  return (
    <label
      htmlFor={id}
      onDragEnter={(e) => { e.preventDefault(); depth.current += 1; if (!disabled) setDragging(true); }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => { depth.current = Math.max(0, depth.current - 1); if (depth.current === 0) setDragging(false); }}
      onDrop={(e) => { e.preventDefault(); depth.current = 0; setDragging(false); take(e.dataTransfer.files?.[0]); }}
      onPaste={(e) => { const f = Array.from(e.clipboardData.files)[0]; if (f) { e.preventDefault(); take(f); } }}
      className={cn(
        "relative block cursor-pointer rounded-xl border-2 border-dashed transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-soft",
        dragging ? "border-primary bg-primary-soft" : "border-border-strong bg-surface-subtle hover:border-primary hover:bg-primary-soft",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
    >
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        aria-label={label}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; }}
      />
      {children({ dragging })}
    </label>
  );
}
