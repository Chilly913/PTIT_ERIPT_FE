"use client";

import { Button } from "@/components/ui/button";
import { StatusPanel } from "@/components/status-panel";
import { messages } from "@/lib/messages";
import { studioMessages as t } from "@/features/studio/messages";

export default function StudioError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <StatusPanel title={t.errorTitle} text={t.errorText} actions={<Button onClick={reset}>{messages.common.retry}</Button>} />;
}
