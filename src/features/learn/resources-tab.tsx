"use client";

import { Button, buttonStyles } from "@/components/ui/button";
import { DownloadIcon } from "@/components/icons";
import { PaperclipIcon } from "@/components/icons";
import type { Attachment } from "@/features/site/types";
import { isHttpUrl } from "./embed";
import { learnMessages as m } from "./messages";

export function ResourcesTab({ attachments }: { attachments: Attachment[] }) {
  if (!attachments.length) {
    return <p className="rounded-lg border border-dashed border-border p-6 text-center text-muted">{m.resources.empty}</p>;
  }
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
      {attachments.map((a) => {
        const url = a.url ?? a.file_path;
        const ok = url && (isHttpUrl(url) || url.startsWith("/"));
        return (
          <li key={a.id} className="flex items-center gap-3 p-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-muted"><PaperclipIcon size={16} /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{a.original_name}</span>
              {a.file_size && <span className="block text-xs text-muted">{m.resources.size}: {a.file_size}</span>}
            </span>
            {ok ? (
              <a href={url} target="_blank" rel="noopener noreferrer" download className={buttonStyles({ variant: "outline", size: "sm" })}>
                <DownloadIcon size={14} />{m.resources.download}
              </a>
            ) : (
              <Button variant="outline" size="sm" disabled>{m.resources.download}</Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
