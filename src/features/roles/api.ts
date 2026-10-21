"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { rolesKey } from "@/features/users/api";
import type { PermissionInfo, RoleInfo } from "@/features/users/types";

export const permissionsKey = ["admin-permissions"] as const;

export function useRoles() {
  return useQuery({
    queryKey: rolesKey,
    queryFn: ({ signal }) => api.get<RoleInfo[]>("/admin/roles", { signal }),
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: permissionsKey,
    queryFn: ({ signal }) => api.get<PermissionInfo[]>("/admin/permissions", { signal }),
    staleTime: 5 * 60_000,
  });
}

export function useSaveRolePermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ role, permissions }: { role: string; permissions: string[] }) =>
      api.put<RoleInfo>(`/admin/roles/${encodeURIComponent(role)}/permissions`, { permissions }),
    onSuccess: (updated) => {
      qc.setQueryData<RoleInfo[]>(rolesKey, (old) => old?.map((r) => (r.name === updated.name ? { ...r, ...updated } : r)));
    },
  });
}
