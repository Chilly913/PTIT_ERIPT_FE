import { ChatWidget } from "@/components/chatbot/chat-widget";
import { SiteHeader } from "@/components/site/site-header";
import { getSiteSettings } from "@/features/site/public-api";
import { siteMessages as t } from "@/features/site/messages";
import { getCurrentUser } from "@/lib/server-api";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([getCurrentUser(), getSiteSettings()]);
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        {t.skip}
      </a>
      <SiteHeader user={user} siteName={settings?.site_name || "ERIPT"} logo={settings?.site_logo ?? null} />
      {children}
      <ChatWidget />
    </div>
  );
}
