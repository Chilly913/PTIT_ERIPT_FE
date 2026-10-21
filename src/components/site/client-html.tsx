"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { richClass } from "@/features/site/sanitize-config";

const LOOKS_LIKE_HTML = /<\/?[a-z][\s\S]*>/i;

/**
 * Client counterpart of SafeHtml (lesson text arrives through React Query).
 * The sanitiser is loaded lazily so it never weighs on pages that do not need it.
 */
export function ClientHtml({ html, className }: { html: string | null | undefined; className?: string }) {
  const src = (html ?? "").trim();
  const [clean, setClean] = useState<string | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    if (!src || !LOOKS_LIKE_HTML.test(src)) return;
    let cancelled = false;
    void Promise.all([import("sanitize-html"), import("@/features/site/sanitize-config")]).then(([mod, cfg]) => {
      if (!cancelled) setClean(mod.default(src, cfg.sanitizeOptions));
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!src) return null;
  if (!LOOKS_LIKE_HTML.test(src)) {
    return <div className={cn("whitespace-pre-line text-[1rem] leading-7", className)}>{src}</div>;
  }
  if (clean === null) return <div className="h-24" aria-hidden />;
  return <div className={cn(richClass, className)} dangerouslySetInnerHTML={{ __html: clean }} />;
}
