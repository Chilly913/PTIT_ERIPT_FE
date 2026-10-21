import { SessionProvider } from "@/components/providers/session-provider";
import { StudioForbidden, StudioShell } from "@/components/studio-shell/studio-shell";
import { canUseStudio } from "@/lib/auth-utils";
import { requireUser } from "@/lib/guards";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/studio");
  return (
    <SessionProvider user={user}>
      {canUseStudio(user) ? <StudioShell>{children}</StudioShell> : <StudioForbidden />}
    </SessionProvider>
  );
}
