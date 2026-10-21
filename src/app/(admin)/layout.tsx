import { AdminShell } from "@/components/admin-shell/admin-shell";
import { Forbidden } from "@/components/admin-shell/forbidden";
import { SessionProvider } from "@/components/providers/session-provider";
import { isAcademicManager, isAdmin } from "@/lib/auth-utils";
import { requireUser } from "@/lib/guards";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // proxy.ts already redirected requests without a cookie; this validates the token and the role.
  const user = await requireUser("/admin");
  return (
    <SessionProvider user={user}>
      {isAdmin(user) || isAcademicManager(user) ? <AdminShell>{children}</AdminShell> : <Forbidden />}
    </SessionProvider>
  );
}