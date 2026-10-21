import Link from "next/link";
import { MailIcon, MapPinIcon, PhoneIcon, ExternalLinkIcon } from "@/components/icons";
import { siteMessages as t } from "@/features/site/messages";
import { Logo } from "@/components/brand/logo";
import type { CategoryNode, SiteSettings } from "@/features/site/types";

/** Footer reads the public site settings (name, texts, contact, social links). Server component. */
export function SiteFooter({ settings, categories }: { settings: SiteSettings | null; categories: CategoryNode[] | null }) {
  const name = settings?.site_name || "ERIPT";
  const socials = Object.entries(settings?.social_links ?? {}).filter(([, v]) => typeof v === "string" && /^https?:\/\//i.test(v));
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[2fr_1fr_1.5fr]">
        <div>
          <Logo className="h-14 w-auto" />
          <p className="mt-3 max-w-sm text-sm text-muted">{settings?.footer_text || t.footer.defaultText}</p>
        </div>
        <nav aria-label={t.footer.explore}>
          <p className="text-sm font-semibold">{t.footer.explore}</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link href="/courses" className="hover:text-foreground">{t.nav.courses}</Link></li>
            <li><Link href="/news" className="hover:text-foreground">{t.nav.news}</Link></li>
            {(categories ?? []).slice(0, 4).map((c) => (
              <li key={c.id}><Link href={`/courses?category=${c.slug}`} className="hover:text-foreground">{c.name}</Link></li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="text-sm font-semibold">{t.footer.contact}</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {settings?.contact_email && <li className="flex items-center gap-2"><MailIcon size={14} /><a href={`mailto:${settings.contact_email}`} className="hover:text-foreground">{settings.contact_email}</a></li>}
            {settings?.contact_phone && <li className="flex items-center gap-2"><PhoneIcon size={14} /><a href={`tel:${settings.contact_phone}`} className="hover:text-foreground">{settings.contact_phone}</a></li>}
            {settings?.contact_address && <li className="flex items-start gap-2"><MapPinIcon size={14} className="mt-0.5" />{settings.contact_address}</li>}
          </ul>
          {socials.length > 0 && (
            <ul aria-label={t.footer.follow} className="mt-4 flex flex-wrap gap-3 text-sm">
              {socials.map(([k, v]) => (
                <li key={k}>
                  <a href={v} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 capitalize text-muted hover:text-foreground">
                    {k}<ExternalLinkIcon size={12} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <p className="border-t border-border px-4 py-4 text-center text-xs text-muted">&copy; {new Date().getFullYear()} {name}. {t.footer.rights}</p>
    </footer>
  );
}
