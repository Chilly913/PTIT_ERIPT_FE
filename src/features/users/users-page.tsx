"use client";

import { Combobox } from "@/components/ui/combobox";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "@/components/providers/session-provider";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  Input,
  PageHeader,
  Pagination,
  Select,
  Skeleton,
  useToast,
} from "@/components/ui";
import { messages } from "@/lib/messages";
import { useRoleList, useUserMutations, useUsers } from "./api";
import { CreateUserDialog } from "./create-user-dialog";
import { ImportStudentsDialog } from "./import-students-dialog";
import { usersMessages as m } from "./messages";
import { UserRolesDialog } from "./roles-dialog";
import type { AdminUser, BulkAction } from "./types";
import { UserActionConfirm, type ConfirmTarget } from "./user-action-confirm";
import { formatDate, formatDateTime, roleLabelMap, RoleBadges, RowMenu, StatusBadge, UserCell, type RowAction } from "./user-parts";
import { PER_PAGE_OPTIONS, useUsersQueryState } from "./use-users-query-state";
import { ResetIcon, SearchIcon, UploadIcon, UserPlusIcon, XIcon } from "@/components/icons";


export function UsersPage() {
  const { user: me } = useSession();
  const toast = useToast();
  const { state, set, isFiltered } = useUsersQueryState();
  const list = useUsers(state);
  const rolesQuery = useRoleList();
  const { bulk } = useUserMutations();
  const labels = useMemo(() => roleLabelMap(rolesQuery.data), [rolesQuery.data]);

  // search box: local text, debounced into the URL
  const [text, setText] = useState(state.q);
  const pushed = useRef(state.q);
  useEffect(() => {
    if (state.q !== pushed.current) {
      pushed.current = state.q;
      setText(state.q);
    }
  }, [state.q]);
  useEffect(() => {
    const next = text.trim();
    if (next === pushed.current) return;
    const t = setTimeout(() => {
      pushed.current = next;
      set({ q: next });
    }, 300);
    return () => clearTimeout(t);
  }, [text, set]);

  // selection (ids), cleared whenever the query changes
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const queryKey = JSON.stringify(state);
  const [prevKey, setPrevKey] = useState(queryKey);
  if (prevKey !== queryKey) {
    setPrevKey(queryKey);
    setSelected(new Set());
  }

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [rolesFor, setRolesFor] = useState<AdminUser | null>(null);
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);

  const rows = list.data?.data ?? [];
  const meta = list.data?.meta;
  const allOnPage = rows.length > 0 && rows.every((u) => selected.has(u.id));
  const someOnPage = rows.some((u) => selected.has(u.id));
  const toggleAll = (on: boolean) => setSelected(on ? new Set(rows.map((u) => u.id)) : new Set());
  const toggleOne = (id: number, on: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  const onRowAction = (u: AdminUser, a: RowAction) => {
    if (a === "roles") setRolesFor(u);
    else if (a === "toggle") setConfirm({ kind: u.disabled ? "enable" : "disable", user: u });
    else setConfirm({ kind: a, user: u });
  };

  const runBulk = async () => {
    if (!bulkAction) return;
    try {
      const r = await bulk.mutateAsync({ action: bulkAction, ids: [...selected] });
      toast.success(m.bulk.done(r.affected));
      setSelected(new Set());
    } catch (e) {
      toast.error(m.toast.failed, e instanceof Error ? e.message : undefined);
    } finally {
      setBulkAction(null);
    }
  };

  const bulkCopy = bulkAction && {
    disable: { title: m.bulk.confirmDisableTitle(selected.size), text: m.bulk.confirmDisableText, label: m.bulk.disable },
    enable: { title: m.bulk.confirmEnableTitle(selected.size), text: m.bulk.confirmEnableText, label: m.bulk.enable },
    delete: { title: m.bulk.confirmDeleteTitle(selected.size), text: m.bulk.confirmDeleteText, label: m.bulk.delete },
  }[bulkAction];

  const colCount = 8;
  const showSkeleton = list.isPending;

  return (
    <>
      <PageHeader
        title={m.title}
        description={m.description}
        actions={
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <UploadIcon className="size-4" aria-hidden /> Nhập từ Excel
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlusIcon className="size-4" aria-hidden /> {m.add}
            </Button>
          </>
        }
      />

      <Card>
        {/* toolbar */}
        <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_11rem_11rem_10rem_8rem_auto]">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <SearchIcon aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input
              type="search"
              aria-label={m.searchLabel}
              placeholder={m.searchPlaceholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="pl-9"
              maxLength={100}
            />
          </div>
          <Combobox className="w-48" aria-label={m.filters.role} value={state.role} onChange={(v) => set({ role: v })} placeholder={m.filters.allRoles} searchPlaceholder="Tìm vai trò..."
            options={(rolesQuery.data ?? []).map((r) => ({ value: r.name, label: r.label }))} />
          <Select aria-label={m.filters.status} value={state.status} onChange={(e) => set({ status: e.target.value as typeof state.status })}>
            <option value="">{m.filters.allStatus}</option>
            <option value="active">{m.status.active}</option>
            <option value="disabled">{m.status.disabled}</option>
            <option value="unverified">{m.status.unverified}</option>
          </Select>
          <Select aria-label={m.filters.sort} value={state.sort} onChange={(e) => set({ sort: e.target.value })}>
            {Object.entries(m.sort).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </Select>
          <Select aria-label={m.filters.perPage} value={state.per_page} onChange={(e) => set({ per_page: Number(e.target.value) })}>
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n} / trang</option>
            ))}
          </Select>
          {isFiltered && (
            <Button
              variant="ghost"
              onClick={() => {
                setText("");
                pushed.current = "";
                set({ q: "", role: "", status: "" });
              }}
            >
              <ResetIcon className="size-4" aria-hidden /> {m.filters.reset}
            </Button>
          )}
        </div>

        {/* bulk bar */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-primary-soft px-4 py-2.5 text-primary-soft-foreground">
            <p className="mr-auto font-medium" role="status">
              {m.bulk.selected(selected.size)}
            </p>
            <Button size="sm" variant="outline" onClick={() => setBulkAction("enable")}>
              {m.bulk.enable}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkAction("disable")}>
              {m.bulk.disable}
            </Button>
            <Button size="sm" variant="danger" onClick={() => setBulkAction("delete")}>
              {m.bulk.delete}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              <XIcon className="size-4" aria-hidden /> {m.bulk.clear}
            </Button>
          </div>
        )}

        <p className="sr-only" role="status" aria-live="polite">
          {meta ? m.resultsLive(meta.total) : ""}
        </p>

        {list.isError && !list.data ? (
          <div className="p-4">
            <Alert tone="danger" title={m.loadError}>
              <p>{list.error.message}</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => list.refetch()}>
                {messages.common.retry}
              </Button>
            </Alert>
          </div>
        ) : (
          <div aria-busy={list.isFetching} className={list.isFetching && !list.isPending ? "opacity-70 transition-opacity" : "transition-opacity"}>
            {/* desktop table (no overflow wrapper so the row menu is never clipped) */}
            <table className="hidden w-full border-collapse text-left lg:table">
              <thead className="bg-surface-muted text-xs font-semibold tracking-wide text-muted uppercase">
                <tr>
                  <th scope="col" className="w-10 py-2.5 pl-4">
                    <Checkbox
                      aria-label={m.columns.selectAll}
                      checked={allOnPage}
                      disabled={rows.length === 0}
                      ref={(el) => {
                        if (el) el.indeterminate = someOnPage && !allOnPage;
                      }}
                      onChange={(e) => toggleAll(e.target.checked)}
                    />
                  </th>
                  <th scope="col" className="px-4 py-2.5">{m.columns.user}</th>
                  <th scope="col" className="px-4 py-2.5">{m.columns.roles}</th>
                  <th scope="col" className="hidden px-4 py-2.5 xl:table-cell">{m.columns.type}</th>
                  <th scope="col" className="px-4 py-2.5">{m.columns.status}</th>
                  <th scope="col" className="hidden px-4 py-2.5 xl:table-cell">{m.columns.created}</th>
                  <th scope="col" className="px-4 py-2.5">{m.columns.lastLogin}</th>
                  <th scope="col" className="w-12 px-4 py-2.5"><span className="sr-only">{m.columns.actions}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {showSkeleton &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} aria-hidden="true">
                      {Array.from({ length: colCount }).map((__, c) => (
                        <td key={c} className="px-4 py-3.5">
                          <Skeleton className="h-4 w-3/4" />
                        </td>
                      ))}
                    </tr>
                  ))}
                {rows.map((u) => (
                  <tr key={u.id} className={selected.has(u.id) ? "bg-primary-soft/40" : "hover:bg-surface-muted/60"}>
                    <td className="py-3 pl-4">
                      <Checkbox aria-label={m.columns.selectRow(u.name)} checked={selected.has(u.id)} onChange={(e) => toggleOne(u.id, e.target.checked)} />
                    </td>
                    <td className="max-w-72 px-4 py-3">
                      <UserCell
                        user={u}
                        self={u.id === me.id}
                        href={
                          <Link href={`/admin/users/${u.id}`} className="hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                            {u.name}
                          </Link>
                        }
                      />
                    </td>
                    <td className="max-w-56 px-4 py-3"><RoleBadges roles={u.roles} labels={labels} /></td>
                    <td className="hidden px-4 py-3 whitespace-nowrap xl:table-cell">{m.userTypes[u.user_type] ?? u.user_type}</td>
                    <td className="px-4 py-3"><StatusBadge user={u} /></td>
                    <td className="hidden px-4 py-3 whitespace-nowrap text-muted xl:table-cell">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">{u.last_login_at ? formatDateTime(u.last_login_at) : m.never}</td>
                    <td className="px-4 py-3 text-right">
                      <RowMenu user={u} self={u.id === me.id} onAction={(a) => onRowAction(u, a)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* mobile / tablet cards */}
            <ul className="divide-y divide-border lg:hidden">
              {showSkeleton &&
                Array.from({ length: 5 }).map((_, i) => (
                  <li key={i} aria-hidden="true" className="flex items-center gap-3 p-4">
                    <Skeleton className="size-9 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-3/4" />
                    </div>
                  </li>
                ))}
              {rows.map((u) => (
                <li key={u.id} className={selected.has(u.id) ? "bg-primary-soft/40 p-4" : "p-4"}>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      className="mt-2"
                      aria-label={m.columns.selectRow(u.name)}
                      checked={selected.has(u.id)}
                      onChange={(e) => toggleOne(u.id, e.target.checked)}
                    />
                    <div className="min-w-0 flex-1">
                      <UserCell
                        user={u}
                        self={u.id === me.id}
                        href={
                          <Link href={`/admin/users/${u.id}`} className="hover:underline">
                            {u.name}
                          </Link>
                        }
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <StatusBadge user={u} />
                        <RoleBadges roles={u.roles} labels={labels} />
                      </div>
                      <p className="mt-1.5 text-sm text-muted">
                        {m.userTypes[u.user_type] ?? u.user_type} · {m.columns.created}: {formatDate(u.created_at)} ·{" "}
                        {u.last_login_at ? formatDateTime(u.last_login_at) : m.never}
                      </p>
                    </div>
                    <RowMenu user={u} self={u.id === me.id} onAction={(a) => onRowAction(u, a)} />
                  </div>
                </li>
              ))}
            </ul>

            {!showSkeleton && rows.length === 0 && (
              <EmptyState
                title={isFiltered ? m.empty.title : m.emptyAll.title}
                description={isFiltered ? m.empty.description : m.emptyAll.description}
                action={
                  isFiltered ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setText("");
                        pushed.current = "";
                        set({ q: "", role: "", status: "" });
                      }}
                    >
                      {m.filters.reset}
                    </Button>
                  ) : (
                    <Button onClick={() => setCreateOpen(true)}>{m.add}</Button>
                  )
                }
              />
            )}
          </div>
        )}

        <Pagination meta={meta} onPageChange={(page) => set({ page })} disabled={list.isFetching} />
      </Card>

      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <ImportStudentsDialog open={importOpen} onClose={() => setImportOpen(false)} />
      <UserRolesDialog user={rolesFor} onClose={() => setRolesFor(null)} />
      <UserActionConfirm target={confirm} onClose={() => setConfirm(null)} />
      <ConfirmDialog
        open={!!bulkAction}
        onClose={() => setBulkAction(null)}
        onConfirm={runBulk}
        title={bulkCopy?.title}
        description={bulkCopy?.text}
        confirmLabel={bulkCopy?.label}
        destructive={bulkAction !== "enable"}
        loading={bulk.isPending}
      />
    </>
  );
}
