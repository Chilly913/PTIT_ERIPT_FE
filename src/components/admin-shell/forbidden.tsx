"use client";

import Link from "next/link";
import { buttonStyles, Button } from "@/components/ui/button";
import { StatusPanel } from "@/components/status-panel";
import { useSession } from "@/components/providers/session-provider";
import { messages } from "@/lib/messages";

/** 403 page: rendered by the (admin) layout when the user is not an admin. */
export function Forbidden() {
  const { logout } = useSession();
  return (
    <main id="main" className="min-h-dvh">
      <StatusPanel
        code="403"
        title={messages.admin.forbiddenTitle}
        text={messages.admin.forbiddenText}
        actions={
          <>
            <Link href="/" className={buttonStyles()}>{messages.common.goHome}</Link>
            <Button variant="outline" onClick={() => void logout()}>{messages.auth.logout}</Button>
          </>
        }
      />
    </main>
  );
}