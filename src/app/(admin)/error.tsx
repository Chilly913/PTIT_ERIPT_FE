"use client";

import { Button } from "@/components/ui/button";
import { StatusPanel } from "@/components/status-panel";
import { messages } from "@/lib/messages";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StatusPanel
      title={messages.admin.errorTitle}
      text={messages.admin.errorText}
      actions={<Button onClick={reset}>{messages.common.retry}</Button>}
    />
  );
}