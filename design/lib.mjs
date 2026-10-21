// Shared helpers for the token tooling (generate / check / contrast). Dependency-free.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const TOKENS_JSON = resolve(ROOT, "design/tokens.json");
export const TOKENS_CSS = resolve(ROOT, "src/styles/tokens.css");
export const THEME_COLOR_TS = resolve(ROOT, "src/styles/theme-color.ts");

export const loadTokens = () => JSON.parse(readFileSync(TOKENS_JSON, "utf8"));

/** True when `file` (import.meta.url) is the script node was started with. */
export const isMain = (metaUrl) => resolve(fileURLToPath(metaUrl)) === resolve(process.argv[1] ?? "");

/** Flatten a nested object into [["a.b.c", value], ...] (leaf strings only). */
export function flatten(obj, prefix = "") {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("$")) continue;
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") out.push(...flatten(v, key));
    else out.push([key, String(v)]);
  }
  return out;
}

/** Primitive path -> CSS variable name. "color.neutral.50" -> "--p-neutral-50", "font.size.14" -> "--p-font-size-14". */
export const primVar = (path) => `--p-${path.replace(/^color\./, "").replace(/\./g, "-")}`;

/** Build maps used by the generator and the validators. */
export function model(tokens) {
  return {
    prim: new Map(flatten(tokens.primitive)), // path -> value
    semLight: tokens.semantic.light,
    semDark: tokens.semantic.dark,
    semNames: Object.keys(tokens.semantic.light),
    comp: tokens.component,
  };
}

/** "{color.neutral.50}" -> var(--p-neutral-50); "{primary}" -> var(--primary); anything else is literal. */
export function toCss(value, m, ctx) {
  const mm = /^\{([^}]+)\}$/.exec(value);
  if (!mm) return value;
  const ref = mm[1];
  if (ref.includes(".")) {
    if (!m.prim.has(ref)) throw new Error(`${ctx}: unknown primitive {${ref}}`);
    return `var(${primVar(ref)})`;
  }
  if (!m.semNames.includes(ref)) throw new Error(`${ctx}: unknown semantic token {${ref}}`);
  return `var(--${ref})`;
}

/** Resolve a semantic token to its final literal value for a theme (follows the primitive ref). */
export function resolveSemantic(name, theme, m) {
  const raw = (theme === "dark" ? m.semDark : m.semLight)[name];
  const mm = /^\{([^}]+)\}$/.exec(raw);
  if (!mm) return raw;
  return m.prim.get(mm[1]);
}

// ---- colour maths ----
export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
}
const lin = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
export const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
