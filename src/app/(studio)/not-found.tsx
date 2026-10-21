import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { StatusPanel } from "@/components/status-panel";
import { studioMessages as t } from "@/features/studio/messages";

export default function StudioNotFound() {
  return (
    <StatusPanel
      code="404"
      title={t.notFoundTitle}
      text={t.notFoundText}
      actions={<Link href="/studio" className={buttonStyles()}>{t.nav.overview}</Link>}
    />
  );
}
