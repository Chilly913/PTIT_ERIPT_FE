import { SiteFooter } from "@/components/site/site-footer";
import { getCategories, getSiteSettings } from "@/features/site/public-api";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const [settings, categories] = await Promise.all([getSiteSettings(), getCategories()]);
  return (
    <>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">{children}</main>
      <SiteFooter settings={settings} categories={categories} />
    </>
  );
}
