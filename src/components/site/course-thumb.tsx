"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { initialsOf, tintOf } from "@/features/site/format";

const tints = [
  "bg-primary-soft text-primary-soft-foreground",
  "bg-success-soft text-success",
  "bg-warning-soft text-warning",
  "bg-info-soft text-info",
  "bg-surface-muted text-muted",
];

/** 16:9 thumbnail. Falls back to a flat tinted block with the title initials. */
export function CourseThumb({
  id,
  title,
  src,
  className,
  priority = false,
}: {
  id: number;
  title: string;
  src?: string | null;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = !!src && !failed;
  return (
    <div className={cn("relative aspect-video w-full overflow-hidden bg-surface-muted", className)}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div aria-hidden className={cn("flex size-full items-center justify-center text-3xl font-bold tracking-wide", tints[tintOf(id, tints.length)])}>
          {initialsOf(title)}
        </div>
      )}
    </div>
  );
}
