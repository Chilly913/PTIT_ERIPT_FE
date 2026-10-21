"use client";

import { Button } from "@/components/ui/button";
import { StatusPanel } from "@/components/status-panel";
import { messages } from "@/lib/messages";

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="min-h-dvh">
      <StatusPanel
        title={messages.admin.errorTitle}
        text={messages.admin.errorText}
        actions={<Button onClick={reset}>{messages.common.retry}</Button>}
      />
    </main>
  );
}