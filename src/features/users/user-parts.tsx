"use client";

import { Avatar, Badge, Dropdown, DropdownContent, DropdownItem, DropdownSeparator, DropdownTrigger } from "@/components/ui";
import { cn } from "@/lib/cn";
import { usersMessages as m } from "./messages";
import type { AdminUser, RoleInfo } from "./types";
import { MoreHorizontalIcon } from "@/components/icons";

const dateFmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" });
const dateTimeFmt = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" });

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateFmt.format(d);
}
export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateTimeFmt.format(d);
}

export function roleLabelMap(roles?: RoleInfo[]) {
  return new Map((roles ?? []).map((r) => [r.name, r.label]));
}

export function RoleBadges({ roles, labels }: { roles: string[]; labels: Map<string, string> }) {
  if (!roles.length) return <span className="text-muted">{m.noRoles}</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {roles.map((r) => (
        <Badge key={r} tone={r === "admin" ? "primary" : "neutral"}>
          {labels.get(r) ?? r}
        </Badge>
      ))}
    </span>
  );
}

export function StatusBadge({ user }: { user: Pick<AdminUser, "disabled" | "email_verified"> }) {
  if (user.disabled) return <Badge tone="danger">{m.statusBadge.disabled}</Badge>;
  if (!user.email_verified) return <Badge tone="warning">{m.statusBadge.unverified}</Badge>;
  return <Badge tone="success">{m.statusBadge.active}</Badge>;
}

export function UserCell({ user, self, href }: { user: AdminUser; self?: boolean; href?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={user.name} src={user.avatar} />
      <div className="min-w-0">
        <p className="truncate font-medium">
          {href ?? user.name}
          {self && <Badge className="ml-2 align-middle" tone="info">{m.you}</Badge>}
        </p>
        <p className="truncate text-muted">{user.email}</p>
      </div>
    </div>
  );
}

export type RowAction = "roles" | "toggle" | "reset" | "delete";

export function RowMenu({
  user,
  self,
  onAction,
  className,
}: {
  user: AdminUser;
  self: boolean;
  onAction: (a: RowAction) => void;
  className?: string;
}) {
  return (
    <Dropdown>
      <DropdownTrigger
        aria-label={m.actions.menu(user.name)}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
          className,
        )}
      >
        <MoreHorizontalIcon className="size-4" aria-hidden />
      </DropdownTrigger>
      <DropdownContent align="end">
        <DropdownItem href={`/admin/users/${user.id}`}>{m.actions.view}</DropdownItem>
        <DropdownItem onSelect={() => onAction("roles")}>{m.actions.roles}</DropdownItem>
        <DropdownItem onSelect={() => onAction("toggle")} disabled={self && !user.disabled}>
          {user.disabled ? m.actions.enable : m.actions.disable}
        </DropdownItem>
        <DropdownItem onSelect={() => onAction("reset")}>{m.actions.resetPassword}</DropdownItem>
        <DropdownSeparator />
        <DropdownItem danger onSelect={() => onAction("delete")} disabled={self}>
          {m.actions.delete}
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
