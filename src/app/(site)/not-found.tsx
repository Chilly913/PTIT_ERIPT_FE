import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { StatusPanel } from "@/components/status-panel";
import { siteMessages as t } from "@/features/site/messages";

export default function SiteNotFound() {
  return (
    <main id="main" className="flex-1">
      <StatusPanel
        code="404"
        title={t.states.notFoundTitle}
        text={t.states.notFoundText}
        actions={
          <>
            <Link href="/courses" className={buttonStyles()}>{t.nav.courses}</Link>
            <Link href="/" className={buttonStyles({ variant: "outline" })}>Trang chủ</Link>
          </>
        }
      />
    </main>
  );
}
