"use client";

import { useState } from "react";
import { Alert, Button, Dialog, Spinner, useToast } from "@/components/ui";
import { messages } from "@/lib/messages";
import { useRoleList, useUserMutations } from "./api";
import { usersMessages as m } from "./messages";
import { RolePicker } from "./role-picker";
import type { AdminUser } from "./types";

export function UserRolesDialog({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  return (
    <Dialog open={!!user} onClose={onClose} title={m.rolesDialog.title} description={user ? m.rolesDialog.description(user.name) : undefined}>
      {user && <Body key={user.id} user={user} onClose={onClose} />}
    </Dialog>
  );
}

function Body({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const toast = useToast();
  const { setRoles } = useUserMutations();
  const rolesQuery = useRoleList();
  const [value, setValue] = useState<string[]>(user.roles);
  const [error, setError] = useState<string | null>(null);

  const same = value.length === user.roles.length && value.every((r) => user.roles.includes(r));
  const save = async () => {
    setError(null);
    try {
      await setRoles.mutateAsync({ id: user.id, roles: value });
      toast.success(m.toast.rolesSaved, user.name);
      onClose();
    } catch (e) {
      // Includes the server's Vietnamese messages for "remove own admin" / "last admin".
      setError(e instanceof Error ? e.message : messages.common.unknownError);
    }
  };

  return (
    <div className="space-y-4">
      {error && <Alert tone="danger">{error}</Alert>}
      {rolesQuery.isPending ? (
        <Spinner label={m.rolesDialog.loading} />
      ) : rolesQuery.isError ? (
        <Alert tone="danger">{rolesQuery.error.message}</Alert>
      ) : (
        <RolePicker roles={rolesQuery.data} value={value} onChange={setValue} disabled={setRoles.isPending} />
      )}
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button variant="outline" onClick={onClose} disabled={setRoles.isPending}>
          {messages.common.cancel}
        </Button>
        <Button onClick={save} loading={setRoles.isPending} disabled={same || value.length === 0}>
          {m.rolesDialog.submit}
        </Button>
      </div>
    </div>
  );
}
