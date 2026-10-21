"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  ConfirmDialog,
  PageHeader,
  Skeleton,
  useToast,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { messages } from "@/lib/messages";
import type { PermissionInfo, RoleInfo } from "@/features/users/types";
import { usePermissions, useRoles, useSaveRolePermissions } from "./api";
import { rolesMessages as m } from "./messages";
import { LockIcon } from "@/components/icons";

const GROUP_ORDER = ["overview", "system", "training", "learning", "finance", "other"] as const;

function sameSet(a: readonly string[], b: ReadonlySet<string>) {
  return a.length === b.size && a.every((p) => b.has(p));
}

export function RolesPage() {
  const rolesQ = useRoles();
  const permsQ = usePermissions();
  const save = useSaveRolePermissions();
  const toast = useToast();
  const router = useRouter();

  const [edits, setEdits] = useState<Record<string, Set<string>>>({});
  const [errorText, setErrorText] = useState<string | null>(null);
  const [leaveTo, setLeaveTo] = useState<string | null>(null);

  const roles = rolesQ.data;
  const perms = permsQ.data;

  const current = (r: RoleInfo) => edits[r.name] ?? new Set(r.permissions);
  const dirtyRoles = useMemo(
    () => (roles ?? []).filter((r) => r.name !== "admin" && edits[r.name] && !sameSet(r.permissions, edits[r.name])),
    [roles, edits],
  );
  const dirty = dirtyRoles.length > 0;

  // Leaving: reload/close tab, and in-app link clicks (App Router has no navigation blocker).
  useEffect(() => {
    if (!dirty) return;
    const before = (e: BeforeUnloadEvent) => e.preventDefault();
    const click = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.origin !== window.location.origin) return;
      const to = a.pathname + a.search;
      if (to === window.location.pathname + window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setLeaveTo(to);
    };
    window.addEventListener("beforeunload", before);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);

  const toggle = (role: RoleInfo, perm: string, on: boolean) => {
    setEdits((all) => {
      const next = new Set(all[role.name] ?? role.permissions);
      if (on) next.add(perm);
      else next.delete(perm);
      return { ...all, [role.name]: next };
    });
  };

  const discard = () => {
    setEdits({});
    setErrorText(null);
  };

  const onSave = async () => {
    setErrorText(null);
    const catalogue = (perms ?? []).map((p) => p.name);
    const results = await Promise.allSettled(
      dirtyRoles.map((r) =>
        save.mutateAsync({ role: r.name, permissions: catalogue.filter((p) => edits[r.name].has(p)) }),
      ),
    );
    const failed: string[] = [];
    const okNames: string[] = [];
    results.forEach((res, i) => {
      const role = dirtyRoles[i];
      if (res.status === "fulfilled") okNames.push(role.name);
      else failed.push(`${role.label}: ${res.reason instanceof Error ? res.reason.message : messages.common.unknownError}`);
    });
    if (okNames.length) {
      setEdits((all) => {
        const n = { ...all };
        okNames.forEach((k) => delete n[k]);
        return n;
      });
    }
    if (failed.length) {
      setErrorText(failed.join(" | "));
      toast.error(m.partial);
    } else {
      toast.success(m.saved, m.savedRoles(dirtyRoles.map((r) => r.label).join(", ")));
    }
  };

  const groups = useMemo(() => {
    const map = new Map<string, PermissionInfo[]>();
    for (const p of perms ?? []) {
      const g = m.groupOf[p.name] ?? "other";
      map.set(g, [...(map.get(g) ?? []), p]);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({ key: g, items: map.get(g)! }));
  }, [perms]);

  if (rolesQ.isPending || permsQ.isPending) {
    return (
      <>
        <PageHeader title={m.title} description={m.description} />
        <div className="space-y-4" aria-busy="true">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </>
    );
  }
  if (rolesQ.isError || permsQ.isError || !roles || !perms) {
    const err = rolesQ.error ?? permsQ.error;
    return (
      <>
        <PageHeader title={m.title} description={m.description} />
        <Alert tone="danger" title={m.loadError}>
          {err?.message}
          <div className="mt-2">
            <Button size="sm" variant="outline" onClick={() => { void rolesQ.refetch(); void permsQ.refetch(); }}>
              {messages.common.retry}
            </Button>
          </div>
        </Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader title={m.title} description={m.description} />

      <ul className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {roles.map((r) => {
          const n = r.name === "admin" ? perms.length : current(r).size;
          return (
            <li key={r.name} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{r.label}</p>
                  <p className="truncate text-sm text-muted">{r.name}</p>
                </div>
                {r.name === "admin" && (
                  <Badge tone="primary">
                    <LockIcon className="size-3" aria-hidden /> {m.matrix.locked}
                  </Badge>
                )}
              </div>
              <p className="mt-3 text-sm text-muted">
                {m.usersCount(r.users_count)} · {m.permCount(n, perms.length)}
              </p>
            </li>
          );
        })}
      </ul>

      <Card>
        <CardHeader>
          <CardTitle>{m.matrix.title}</CardTitle>
          <CardDescription>
            {m.matrix.description} {m.matrix.lockedAdmin}
          </CardDescription>
        </CardHeader>

        {errorText && (
          <div className="p-4 pb-0">
            <Alert tone="danger">{errorText}</Alert>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 border-y border-border bg-surface-muted/40 px-4 py-3">
          <p className="mr-auto text-sm text-muted" role="status" aria-live="polite">
            {dirty ? m.dirty(dirtyRoles.length) : m.clean}
          </p>
          <Button variant="outline" onClick={discard} disabled={!dirty || save.isPending}>
            {m.discard}
          </Button>
          <Button onClick={onSave} loading={save.isPending} disabled={!dirty}>
            {m.save}
          </Button>
        </div>
        <div className="max-h-[70dvh] overflow-auto">
          <table className="w-full min-w-170 border-collapse text-left">
            <thead className="sticky top-0 z-20 bg-surface-muted text-xs font-semibold text-muted">
              <tr>
                <th scope="col" className="sticky left-0 z-30 w-56 min-w-44 bg-surface-muted px-4 py-3 uppercase">
                  {m.matrix.permission}
                </th>
                {roles.map((r) => (
                  <th key={r.name} scope="col" className="px-3 py-3 text-center whitespace-nowrap">
                    <span className="block text-foreground">{r.label}</span>
                    <span className="block font-normal">{r.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <Fragment key={g.key}>
                  <tr>
                    <th
                      scope="colgroup"
                      colSpan={roles.length + 1}
                      className="sticky left-0 border-y border-border bg-surface-muted/60 px-4 py-2 text-xs font-semibold tracking-wide text-muted uppercase"
                    >
                      {m.groups[g.key as keyof typeof m.groups]}
                    </th>
                  </tr>
                  {g.items.map((p) => (
                    <tr key={p.name} className="border-b border-border last:border-0 hover:bg-surface-muted/40">
                      <th scope="row" className="sticky left-0 z-10 bg-surface px-4 py-2.5 font-normal">
                        <span className="block font-medium">{p.label}</span>
                        <span className="block text-sm text-muted">{p.description}</span>
                      </th>
                      {roles.map((r) => {
                        const locked = r.name === "admin";
                        const checked = locked || current(r).has(p.name);
                        const changed = !locked && checked !== r.permissions.includes(p.name);
                        return (
                          <td key={r.name} className={cn("px-3 py-2.5 text-center", changed && "bg-warning-soft")}>
                            <Checkbox
                              className="justify-center"
                              aria-label={m.matrix.toggle(p.label, r.label)}
                              checked={checked}
                              disabled={locked || save.isPending}
                              onChange={(e) => toggle(r, p.name, e.target.checked)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

      </Card>

      <ConfirmDialog
        open={leaveTo !== null}
        onClose={() => setLeaveTo(null)}
        onConfirm={() => {
          const to = leaveTo;
          setLeaveTo(null);
          setEdits({});
          if (to) setTimeout(() => router.push(to), 0);
        }}
        title={m.leave.title}
        description={m.leave.text}
        confirmLabel={m.leave.go}
        cancelLabel={m.leave.stay}
        destructive
      />
    </>
  );
}
