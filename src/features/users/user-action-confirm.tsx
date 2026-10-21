"use client";

import { ConfirmDialog, useToast } from "@/components/ui";
import { messages } from "@/lib/messages";
import { useUserMutations } from "./api";
import { usersMessages as m } from "./messages";
import type { AdminUser } from "./types";

export type ConfirmKind = "disable" | "enable" | "delete" | "reset";
export interface ConfirmTarget {
  kind: ConfirmKind;
  user: AdminUser;
}

/** One confirm dialog for every single-user action; runs the mutation and reports the server's message on failure. */
export function UserActionConfirm({
  target,
  onClose,
  onDone,
}: {
  target: ConfirmTarget | null;
  onClose: () => void;
  onDone?: (kind: ConfirmKind, user: AdminUser) => void;
}) {
  const toast = useToast();
  const mut = useUserMutations();
  const pending = mut.disable.isPending || mut.enable.isPending || mut.remove.isPending || mut.resetPassword.isPending;

  const copy = (t: ConfirmTarget) => {
    const c = m.confirm;
    switch (t.kind) {
      case "disable":
        return { title: c.disableTitle, text: c.disableText(t.user.name), label: m.actions.disable, destructive: true };
      case "enable":
        return { title: c.enableTitle, text: c.enableText(t.user.name), label: m.actions.enable, destructive: false };
      case "delete":
        return { title: c.deleteTitle, text: c.deleteText(t.user.name), label: messages.common.delete, destructive: true };
      case "reset":
        return { title: c.resetTitle, text: c.resetText(t.user.email), label: c.resetAction, destructive: false };
    }
  };

  const run = async () => {
    if (!target) return;
    const { kind, user } = target;
    try {
      if (kind === "disable") await mut.disable.mutateAsync(user.id);
      else if (kind === "enable") await mut.enable.mutateAsync(user.id);
      else if (kind === "delete") await mut.remove.mutateAsync(user.id);
      else await mut.resetPassword.mutateAsync(user.id);
      const done = { disable: m.toast.disabled, enable: m.toast.enabled, delete: m.toast.deleted, reset: m.toast.resetSent }[kind];
      toast.success(done, user.name);
      onClose();
      onDone?.(kind, user);
    } catch (e) {
      toast.error(m.toast.failed, e instanceof Error ? e.message : undefined);
      onClose();
    }
  };

  const c = target ? copy(target) : null;
  return (
    <ConfirmDialog
      open={!!target}
      onClose={onClose}
      onConfirm={run}
      title={c?.title}
      description={c?.text}
      confirmLabel={c?.label}
      destructive={c?.destructive}
      loading={pending}
    />
  );
}
