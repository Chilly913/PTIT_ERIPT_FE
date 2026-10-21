"use client";

import { cloneElement, useId, useState } from "react";
import { cn } from "@/lib/cn";

/** Wraps a single focusable child; shows `content` on hover/focus (ESC hides it). */
export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: {
  content: React.ReactNode;
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  side?: "top" | "bottom";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
    >
      {cloneElement(children, { "aria-describedby": open ? id : undefined })}
      {open && (
        <span
          role="tooltip"
          id={id}
          className={cn(
            "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 rounded-md bg-(--tooltip-bg) px-2 py-1 text-xs whitespace-nowrap text-(color:--tooltip-fg) shadow-md animate-[fade-in_0.1s_ease-out]",
            side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
            className,
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}