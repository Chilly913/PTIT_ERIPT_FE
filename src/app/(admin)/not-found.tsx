import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { StatusPanel } from "@/components/status-panel";
import { messages } from "@/lib/messages";

/** Rendered inside the admin shell when a page calls notFound(). */
export default function AdminNotFound() {
  return (
    <StatusPanel
      code="404"
      title={messages.admin.notFoundTitle}
      text={messages.admin.notFoundText}
      actions={<Link href="/admin" className={buttonStyles()}>{messages.admin.nav.dashboard}</Link>}
    />
  );
}