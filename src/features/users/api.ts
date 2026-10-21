"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Paginated } from "@/lib/types";
import type { AdminUser, AdminUserDetail, BulkAction, RoleInfo, UsersQuery } from "./types";

export const usersKey = ["admin-users"] as const;
export const rolesKey = ["admin-roles"] as const;

export function useUsers(query: UsersQuery) {
  return useQuery({
    queryKey: [...usersKey, "list", query],
    queryFn: ({ signal }) => api.get<Paginated<AdminUser>>("/admin/users", { query: { ...query }, signal }),
    placeholderData: keepPreviousData,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: [...usersKey, "detail", id],
    queryFn: ({ signal }) => api.get<AdminUserDetail>(`/admin/users/${id}`, { signal }),
  });
}

export function useRoleList() {
  return useQuery({
    queryKey: rolesKey,
    queryFn: ({ signal }) => api.get<RoleInfo[]>("/admin/roles", { signal }),
    staleTime: 60_000,
  });
}

/** Patch the row everywhere it is cached (lists + detail), then refetch in the background. */
function patchCaches(qc: QueryClient, user: AdminUser) {
  qc.setQueriesData<Paginated<AdminUser>>({ queryKey: [...usersKey, "list"] }, (old) =>
    old ? { ...old, data: old.data.map((u) => (u.id === user.id ? { ...u, ...user } : u)) } : old,
  );
  qc.setQueriesData<AdminUserDetail>({ queryKey: [...usersKey, "detail", String(user.id)] }, (old) => (old ? { ...old, ...user } : old));
  void qc.invalidateQueries({ queryKey: usersKey });
  void qc.invalidateQueries({ queryKey: rolesKey });
}

export function useUserMutations() {
  const qc = useQueryClient();
  const done = (u: AdminUser) => patchCaches(qc, u);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: usersKey });
    void qc.invalidateQueries({ queryKey: rolesKey });
  };
  return {
    disable: useMutation({ mutationFn: (id: number) => api.post<AdminUser>(`/admin/users/${id}/disable`), onSuccess: done }),
    enable: useMutation({ mutationFn: (id: number) => api.post<AdminUser>(`/admin/users/${id}/enable`), onSuccess: done }),
    remove: useMutation({ mutationFn: (id: number) => api.delete(`/admin/users/${id}`), onSuccess: refresh }),
    resetPassword: useMutation({ mutationFn: (id: number) => api.post(`/admin/users/${id}/reset-password`) }),
    setRoles: useMutation({
      mutationFn: ({ id, roles }: { id: number; roles: string[] }) => api.put<AdminUser>(`/admin/users/${id}/roles`, { roles }),
      onSuccess: done,
    }),
    bulk: useMutation({
      mutationFn: ({ action, ids }: { action: BulkAction; ids: number[] }) =>
        api.post<{ affected: number }>("/admin/users/bulk", { action, ids }),
      onSuccess: refresh,
    }),
    create: useMutation({ mutationFn: (body: Record<string, unknown>) => api.post<AdminUser>("/admin/users", body), onSuccess: refresh }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) => api.put<AdminUserDetail>(`/admin/users/${id}`, body),
      onSuccess: (u) => {
        qc.setQueryData([...usersKey, "detail", String(u.id)], u);
        refresh();
      },
    }),
  };
}
