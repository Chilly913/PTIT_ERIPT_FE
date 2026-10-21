"use client";

import { Button } from "@/components/ui/button";
import { StatusPanel } from "@/components/status-panel";
import { siteMessages as t } from "@/features/site/messages";

export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="flex-1">
      <StatusPanel title={t.states.errorTitle} text={t.states.errorText} actions={<Button onClick={reset}>{t.states.retry}</Button>} />
    </main>
  );
}
