"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { User } from "@/lib/types";

interface SessionValue {
  user: User;
  /** Revokes the token, clears the cookie, then goes to /login. */
  logout: () => Promise<void>;
}
const Ctx = createContext<SessionValue | null>(null);

/** Hydrated by a server layout with the user it already fetched (no extra request). */
export function SessionProvider({ user, children }: { user: User; children: React.ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [, setBusy] = useState(false);

  const logout = useCallback(async () => {
    setBusy(true);
    try {
      await apiRequest("POST", "/session/logout");
    } finally {
      qc.clear();
      router.replace("/login");
      router.refresh();
    }
  }, [qc, router]);

  const value = useMemo(() => ({ user, logout }), [user, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSession must be used inside <SessionProvider>");
  return c;
}

/** Permission check against `user.permissions` (admin role passes everything). */
export function useCan() {
  const { user } = useSession();
  return useCallback((perm: string) => user.roles?.includes("admin") || user.permissions?.includes(perm), [user]);
}