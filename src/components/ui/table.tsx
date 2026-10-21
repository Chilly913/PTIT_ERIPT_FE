import { cn } from "@/lib/cn";
import { messages } from "@/lib/messages";
import { Skeleton } from "./skeleton";
import { EmptyState } from "./empty-state";
import { InboxIcon } from "@/components/icons";

/** Horizontally scrollable table container. */
export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-left", className)} {...props} />
    </div>
  );
}
export function THead(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className="border-b border-(--table-divider) bg-(--table-header-bg) text-xs font-semibold tracking-wide text-(color:--table-header-fg) uppercase" {...props} />;
}
export function TBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="divide-y divide-(--table-divider)" {...props} />;
}
export function Tr({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("transition-colors hover:bg-(--table-row-hover) data-[selected=true]:bg-(--table-row-selected)", className)} {...props} />;
}
export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" className={cn("px-4 py-2.5 font-semibold whitespace-nowrap", className)} {...props} />;
}
export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 align-middle", className)} {...props} />;
}

/** Skeleton rows for a loading table body. */
export function TableSkeleton({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} aria-hidden="true">
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c} className="px-4 py-3.5">
              <Skeleton className={cn("h-4", c === 0 ? "w-3/4" : "w-1/2")} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Empty row spanning the table. */
export function TableEmpty({ columns, title = messages.common.noData, description }: { columns: number; title?: React.ReactNode; description?: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={columns}>
        <EmptyState icon={<InboxIcon />} title={title} description={description} />
      </td>
    </tr>
  );
}