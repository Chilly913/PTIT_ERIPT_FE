"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { StarIcon } from "@/components/icons";

/** Read-only star row (supports fractions by clipping a solid layer, no gradients). */
export function Stars({ value, size = 14, className }: { value: number; size?: number; className?: string }) {
  const pct = Math.max(0, Math.min(5, value)) / 5 * 100;
  return (
    <span className={cn("relative inline-flex", className)} role="img" aria-label={`${value.toFixed(1)} trên 5 sao`}>
      <span className="inline-flex text-border-strong" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => <StarIcon key={i} size={size} className="fill-current" />)}
      </span>
      <span className="absolute inset-y-0 left-0 inline-flex overflow-hidden text-warning" style={{ width: `${pct}%` }} aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => <StarIcon key={i} size={size} className="fill-current" />)}
      </span>
    </span>
  );
}

/** Radio-group style star picker, keyboard accessible (arrow keys). */
export function StarInput({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex gap-0.5"
      onMouseLeave={() => setHover(0)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); onChange(Math.min(5, (value || 0) + 1)); }
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); onChange(Math.max(1, (value || 2) - 1)); }
      }}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} sao`}
          tabIndex={value === n || (!value && n === 1) ? 0 : -1}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className={cn("rounded p-0.5 transition-colors", n <= shown ? "text-warning" : "text-border-strong")}
        >
          <StarIcon size={24} className="fill-current" />
        </button>
      ))}
    </div>
  );
}
