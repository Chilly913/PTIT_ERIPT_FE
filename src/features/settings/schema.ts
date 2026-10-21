import { z } from "zod";
import { settingsMessages as t } from "./messages";

export interface SocialRow {
  name: string;
  url: string;
}

export interface SettingsFormValues {
  site_name: string;
  site_logo: string;
  site_favicon: string;
  primary_color: string;
  footer_text: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  social: SocialRow[];
  smtp_host: string;
  smtp_port: string;
  smtp_username: string;
  smtp_encryption: string;
  mail_from_address: string;
  mail_from_name: string;
  smtp_password: string;
}

/** Server shape of GET/PUT /admin/settings. */
export interface SettingsResponse {
  settings: Partial<{
    site_name: string; site_logo: string; site_favicon: string; primary_color: string; footer_text: string;
    contact_email: string; contact_phone: string; contact_address: string; social_links: Record<string, string>;
    smtp_host: string; smtp_port: number; smtp_username: string; smtp_encryption: string;
    mail_from_address: string; mail_from_name: string;
  }>;
  secrets: { smtp_password: boolean };
}

export const TAB_FIELDS = {
  general: ["site_name", "site_logo", "site_favicon", "primary_color", "footer_text"],
  contact: ["contact_email", "contact_phone", "contact_address", "social"],
  smtp: ["smtp_host", "smtp_port", "smtp_username", "smtp_encryption", "mail_from_address", "mail_from_name", "smtp_password"],
} as const satisfies Record<string, readonly (keyof SettingsFormValues)[]>;
export type TabId = keyof typeof TAB_FIELDS;
export const FORM_FIELDS = Object.values(TAB_FIELDS).flat() as string[];

const optional = (max: number) => z.string().trim().max(max, t.v.max(max));
const mediaUrl = z
  .string()
  .trim()
  .max(2048, t.v.max(2048))
  .refine((v) => !v || (/^(https?:\/\/\S+|\/\S*)$/i.test(v) && !v.includes("..")), t.image.invalid);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const social = z
  .array(z.object({ name: z.string().trim(), url: z.string().trim() }))
  .superRefine((rows, ctx) => {
    const seen = new Set<string>();
    rows.forEach((r, i) => {
      if (!r.name && !r.url) return;
      if (!r.name || !r.url) {
        ctx.addIssue({ code: "custom", path: [i, r.name ? "url" : "name"], message: t.v.socialBoth });
        return;
      }
      if (!/^[a-z0-9_-]{1,30}$/.test(r.name)) ctx.addIssue({ code: "custom", path: [i, "name"], message: t.v.socialName });
      else if (seen.has(r.name)) ctx.addIssue({ code: "custom", path: [i, "name"], message: t.v.socialDup });
      seen.add(r.name);
      if (!/^https?:\/\/\S+$/i.test(r.url) || r.url.length > 2048) ctx.addIssue({ code: "custom", path: [i, "url"], message: t.v.socialUrl });
    });
    if (rows.filter((r) => r.name || r.url).length > 20) ctx.addIssue({ code: "custom", path: [], message: t.contact.max });
  });

export const settingsSchema = z.object({
  site_name: z.string().trim().max(255, t.v.siteName),
  site_logo: mediaUrl,
  site_favicon: mediaUrl,
  primary_color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, t.v.color),
  footer_text: optional(2000),
  contact_email: optional(255).refine((v) => !v || EMAIL.test(v), t.v.email),
  contact_phone: optional(30).refine((v) => !v || /^[0-9 +().-]{5,30}$/.test(v), t.v.phone),
  contact_address: optional(500),
  social,
  smtp_host: optional(255).refine((v) => !v || /^[A-Za-z0-9.-]+$/.test(v), t.v.host),
  smtp_port: z
    .string()
    .trim()
    .refine((v) => !v || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 65535), t.v.port),
  smtp_username: optional(255),
  smtp_encryption: z.string(),
  mail_from_address: optional(255).refine((v) => !v || EMAIL.test(v), t.v.email),
  mail_from_name: optional(255),
  smtp_password: z.string().max(255, t.v.max(255)),
});

export const DEFAULT_COLOR = "#2563EB";

export function toFormValues(r: SettingsResponse): SettingsFormValues {
  const s = r.settings;
  return {
    site_name: s.site_name ?? "",
    site_logo: s.site_logo ?? "",
    site_favicon: s.site_favicon ?? "",
    primary_color: (s.primary_color ?? DEFAULT_COLOR).toUpperCase(),
    footer_text: s.footer_text ?? "",
    contact_email: s.contact_email ?? "",
    contact_phone: s.contact_phone ?? "",
    contact_address: s.contact_address ?? "",
    social: Object.entries(s.social_links ?? {}).map(([name, url]) => ({ name, url })),
    smtp_host: s.smtp_host ?? "",
    smtp_port: s.smtp_port != null ? String(s.smtp_port) : "",
    smtp_username: s.smtp_username ?? "",
    smtp_encryption: s.smtp_encryption ?? "",
    mail_from_address: s.mail_from_address ?? "",
    mail_from_name: s.mail_from_name ?? "",
    smtp_password: "",
  };
}

const socialObject = (rows: SocialRow[]) =>
  Object.fromEntries(rows.map((r) => ({ name: r.name.trim(), url: r.url.trim() })).filter((r) => r.name || r.url).map((r) => [r.name, r.url]));

type PasswordAction = "keep" | "change" | "clear";

export interface Diff {
  settings: Record<string, string | number | Record<string, string> | null>;
  secrets: Record<string, string | null>;
  /** Form fields that changed (used for per-tab dirty markers). */
  fields: Set<string>;
}

const STRING_KEYS = [
  "site_name", "site_logo", "site_favicon", "footer_text", "contact_email", "contact_phone", "contact_address",
  "smtp_host", "smtp_username", "smtp_encryption", "mail_from_address", "mail_from_name",
] as const;

/** Only the keys that differ from the baseline, in API shape (empty -> null deletes the key). */
export function computeDiff(base: SettingsFormValues, cur: SettingsFormValues, pw: PasswordAction): Diff {
  const settings: Diff["settings"] = {};
  const secrets: Diff["secrets"] = {};
  const fields = new Set<string>();
  for (const k of STRING_KEYS) {
    const a = base[k].trim();
    const b = cur[k].trim();
    if (a !== b) {
      settings[k] = b === "" ? null : b;
      fields.add(k);
    }
  }
  if (base.primary_color.trim().toUpperCase() !== cur.primary_color.trim().toUpperCase()) {
    settings.primary_color = cur.primary_color.trim().toUpperCase();
    fields.add("primary_color");
  }
  if (base.smtp_port.trim() !== cur.smtp_port.trim()) {
    settings.smtp_port = cur.smtp_port.trim() === "" ? null : Number(cur.smtp_port);
    fields.add("smtp_port");
  }
  const sa = socialObject(base.social);
  const sb = socialObject(cur.social);
  if (JSON.stringify(sa) !== JSON.stringify(sb)) {
    settings.social_links = Object.keys(sb).length ? sb : null;
    fields.add("social");
  }
  if (pw === "clear") {
    secrets.smtp_password = null;
    fields.add("smtp_password");
  } else if (pw === "change" && cur.smtp_password !== "") {
    secrets.smtp_password = cur.smtp_password;
    fields.add("smtp_password");
  }
  return { settings, secrets, fields };
}
