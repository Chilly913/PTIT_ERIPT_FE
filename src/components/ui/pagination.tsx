import { messages } from "@/lib/messages";
import { Button } from "./button";
import type { PageMeta } from "@/lib/types";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

/** Pass `meta` from a Paginated<T> response. Hidden when there is nothing to page. */
export function Pagination({ meta, onPageChange, disabled }: { meta?: PageMeta; onPageChange: (page: number) => void; disabled?: boolean }) {
  if (!meta || meta.total === 0) return null;
  const from = (meta.page - 1) * meta.per_page + 1;
  const to = Math.min(meta.page * meta.per_page, meta.total);
  return (
    <nav aria-label="Phân trang" className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
      <p className="text-muted">
        {from}–{to} {messages.common.of} {meta.total} {messages.common.results}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={disabled || meta.page <= 1} onClick={() => onPageChange(meta.page - 1)}>
          <ChevronLeftIcon className="size-4" aria-hidden /> {messages.common.previous}
        </Button>
        <span aria-current="page" className="min-w-16 text-center text-muted">
          {meta.page} / {meta.last_page}
        </span>
        <Button variant="outline" size="sm" disabled={disabled || meta.page >= meta.last_page} onClick={() => onPageChange(meta.page + 1)}>
          {messages.common.next} <ChevronRightIcon className="size-4" aria-hidden />
        </Button>
      </div>
    </nav>
  );
}