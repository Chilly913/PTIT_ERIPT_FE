"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { PageMeta } from "@/lib/types";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/icons";
import { Alert } from "./alert";
import { Pagination } from "./pagination";
import { Skeleton } from "./skeleton";
import { Table, TableEmpty, TBody, Td, Th, THead, Tr } from "./table";

export interface Column<T> {
  key: string;
  header: string;
  /** Server-side sort key; omit to make the column non-sortable. */
  sort?: string;
  align?: "left" | "right" | "center";
  className?: string;
  cell: (row: T) => ReactNode;
}

export interface SortState {
  key: string;
  dir: "asc" | "desc";
}

const alignClass = { left: "text-left", right: "text-right", center: "text-center" } as const;

/**
 * Data table: an automatic "STT" (row number) column, sortable headers (aria-sort),
 * loading skeleton, empty state and pagination. Filters/search/actions go in `toolbar`.
 */
export function DataTable<T extends { id: number }>({
  columns,
  rows,
  loading,
  error,
  meta,
  sort,
  onSort,
  onPage,
  fetching,
  toolbar,
  rowActions,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  error?: string | null;
  meta?: PageMeta;
  sort?: SortState;
  onSort?: (s: SortState) => void;
  onPage?: (page: number) => void;
  fetching?: boolean;
  toolbar?: ReactNode;
  rowActions?: (row: T) => ReactNode;
  empty?: { title: string; description?: string };
}) {
  const offset = meta ? (meta.page - 1) * meta.per_page : 0;
  const cols = columns.length + 1 + (rowActions ? 1 : 0);

  const toggle = (key: string) => {
    if (!onSort) return;
    onSort(sort?.key === key && sort.dir === "asc" ? { key, dir: "desc" } : { key, dir: "asc" });
  };

  return (
    <div>
      {toolbar}
      {error && <Alert tone="danger" className="mb-3">{error}</Alert>}
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <Table>
          <THead>
            <Tr>
              <Th className="w-14 text-center">STT</Th>
              {columns.map((c) => {
                const active = c.sort && sort?.key === c.sort;
                return (
                  <Th key={c.key} aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : c.sort ? "none" : undefined} className={cn(alignClass[c.align ?? "left"], c.className)}>
                    {c.sort ? (
                      <button type="button" onClick={() => toggle(c.sort!)} className={cn("inline-flex items-center gap-1 uppercase hover:text-foreground", active && "text-foreground", c.align === "right" && "flex-row-reverse")}>
                        {c.header}
                        <span className="flex flex-col leading-none" aria-hidden>
                          <ChevronUpIcon size={10} className={cn(active && sort!.dir === "asc" ? "text-primary" : "opacity-30")} />
                          <ChevronDownIcon size={10} className={cn(active && sort!.dir === "desc" ? "text-primary" : "opacity-30")} />
                        </span>
                      </button>
                    ) : (
                      c.header
                    )}
                  </Th>
                );
              })}
              {rowActions && <Th className="text-right">Thao tác</Th>}
            </Tr>
          </THead>
          <TBody>
            {loading && Array.from({ length: 5 }).map((_, i) => <Tr key={i}><Td colSpan={cols}><Skeleton className="h-8 w-full" /></Td></Tr>)}
            {!loading && rows.length === 0 && <TableEmpty columns={cols} title={empty?.title ?? "Chưa có dữ liệu"} description={empty?.description} />}
            {!loading && rows.map((row, i) => (
              <Tr key={row.id}>
                <Td className="text-center text-muted tabular-nums">{offset + i + 1}</Td>
                {columns.map((c) => <Td key={c.key} className={cn(alignClass[c.align ?? "left"], c.className)}>{c.cell(row)}</Td>)}
                {rowActions && <Td><div className="flex justify-end gap-1">{rowActions(row)}</div></Td>}
              </Tr>
            ))}
          </TBody>
        </Table>
        {meta && onPage && <Pagination meta={meta} onPageChange={onPage} disabled={fetching} />}
      </div>
    </div>
  );
}
