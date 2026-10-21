// Generates src/styles/tokens.css (+ src/styles/theme-color.ts) from design/tokens.json.
//   node design/generate.mjs   write the files
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { THEME_COLOR_TS, TOKENS_CSS, isMain, loadTokens, model, primVar, resolveSemantic, toCss } from "./lib.mjs";

/** Dark is dormant: it stays in tokens.json (and is validated) but is only emitted with `withDark`. */
export const WITH_DARK = process.argv.includes("--with-dark");

export function buildCss(tokens = loadTokens(), { withDark = WITH_DARK } = {}) {
  const m = model(tokens);
  const lines = (entries, indent = "  ") => entries.map(([k, v]) => `${indent}${k}: ${v};`).join("\n");
  for (const n of m.semNames) if (!(n in m.semDark)) throw new Error(`semantic.dark is missing "${n}"`);
  for (const n of Object.keys(m.semDark)) if (!m.semNames.includes(n)) throw new Error(`semantic.light is missing "${n}"`);
  const sem = (theme) =>
    m.semNames.map((n) => [`--${n}`, toCss((theme === "dark" ? m.semDark : m.semLight)[n], m, `semantic.${theme}.${n}`)]);
  const comp = Object.entries(m.comp).map(([n, v]) => {
    if (/^\{color\./.test(v)) throw new Error(`component.${n}: components must reference semantic tokens, not colour primitives (${v})`);
    return [`--${n}`, toCss(v, m, `component.${n}`)];
  });
  const prim = [...m.prim.entries()].map(([p, v]) => [primVar(p), v]);

  const head = `/*
 * GENERATED FILE - DO NOT EDIT.
 * Source: design/tokens.json   Generator: design/generate.mjs   (npm run tokens:build)
 * Layers: primitive (--p-*) -> semantic (--background, --primary, ...) -> component (--btn-*, --input-*, ...)
 * Rule: flat colours only. No gradients, no glow blobs. The product is light-only; the dark layer is dormant
 * (emit it with \`node design/generate.mjs --with-dark\`).
 */

/* ---------- 1. Primitives (raw scales; do not use directly in components) ---------- */
:root {
${lines(prim)}
}
`;
  if (!withDark)
    return `${head}
/* ---------- 2. Semantic (light only) ---------- */
:root {
  color-scheme: light;
${lines(sem("light"))}
}

/* ---------- 3. Component tokens ---------- */
:root {
${lines(comp)}
}
`;

  return `${head}
/* ---------- 2. Semantic, light (default; also scopes a light island with data-theme="light") ---------- */
:root,
[data-theme="light"] {
  color-scheme: light;
${lines(sem("light"))}
}

/* ---------- 2. Semantic, dark: follows the OS unless the user forced light ---------- */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
${lines(sem("dark"), "    ")}
  }
}

/* ---------- 2. Semantic, dark: forced via data-theme (also scopes a dark island) ---------- */
[data-theme="dark"] {
  color-scheme: dark;
${lines(sem("dark"))}
}

/* ---------- 3. Component tokens ---------- */
:root,
[data-theme="light"],
[data-theme="dark"] {
${lines(comp)}
}
`;
}

export function buildThemeColorTs(tokens = loadTokens(), { withDark = WITH_DARK } = {}) {
  const m = model(tokens);
  return `// GENERATED FILE - DO NOT EDIT. Source: design/tokens.json (npm run tokens:build)
// Literal values for places that cannot use CSS variables (e.g. <meta name="theme-color">).
export const THEME_COLOR = {
  light: "${resolveSemantic("background", "light", m)}",${withDark ? `
  dark: "${resolveSemantic("background", "dark", m)}",` : ""}
} as const;
`;
}

if (isMain(import.meta.url)) {
  mkdirSync(dirname(TOKENS_CSS), { recursive: true });
  writeFileSync(TOKENS_CSS, buildCss());
  writeFileSync(THEME_COLOR_TS, buildThemeColorTs());
  console.log("tokens: wrote src/styles/tokens.css and src/styles/theme-color.ts");
}
