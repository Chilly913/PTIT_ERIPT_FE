import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { StatusPanel } from "@/components/status-panel";
import { messages } from "@/lib/messages";

export default function NotFound() {
  return (
    <main id="main" className="min-h-dvh">
      <StatusPanel
        code="404"
        title={messages.admin.notFoundTitle}
        text={messages.admin.notFoundText}
        actions={<Link href="/" className={buttonStyles()}>{messages.common.goHome}</Link>}
      />
    </main>
  );
}