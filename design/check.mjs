// Design-system guard. Run: npm run tokens:check (also part of `npm run lint`).
// Fails on:
//   (a) any gradient / glow-blob utility or CSS function in src/**
//   (b) raw hex / rgb() / hsl() / oklch() colours in src/**/*.tsx outside src/styles and the dev design-system page
//   (c) src/styles/tokens.css (or theme-color.ts) out of date vs design/tokens.json
//   (d) semantic colour tokens without a Tailwind `--color-*` mapping in globals.css
//   (e) WCAG AA contrast / colour-blind failures in the palette
// Escape hatch for (b): put `design-allow-raw` in a comment on the same line (e.g. third-party brand logos).
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { buildCss, buildThemeColorTs } from "./generate.mjs";
import { runContrast } from "./contrast.mjs";
import { ROOT, THEME_COLOR_TS, TOKENS_CSS, isMain, loadTokens, model } from "./lib.mjs";

const SRC = join(ROOT, "src");
const rel = (f) => relative(ROOT, f).split(sep).join("/");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|css|mdx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}

// (a) gradients: CSS functions, Tailwind gradient utilities, gradient text, decorative blur blobs.
const GRADIENT_RULES = [
  [/gradient\(/i, "gradient CSS function"],
  [/\bbg-gradient/, "bg-gradient-* utility"],
  [/\bbg-(linear|radial|conic)(-|\[|\/|\b)/, "bg-linear/radial/conic utility (gradient)"],
  [/(?:^|[\s"'`:])(?:from|via)-[\w[(#/.-]+/, "from-*/via-* gradient stop"],
  [/\bbg-clip-text\b/, "bg-clip-text (gradient text)"],
  [/(?<!backdrop-)\bblur-(?:\[[^\]]+\]|\d+|sm|md|lg|xl|2xl|3xl)\b/, "blur-* (decorative glow blob)"],
];
// Third-party brand marks that must keep their official colours (file-level allowance).
const RAW_COLOR_ALLOWED_FILES = new Set(["src/components/auth/google-button.tsx"]);
// (b) raw colours
const RAW_COLOR = /(?<![\w&/#])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/;

export function run() {
  const problems = [];
  const files = walk(SRC);

  for (const f of files) {
    const r = rel(f);
    if (r === "src/styles/tokens.css") continue; // generated; verified separately
    const lines = readFileSync(f, "utf8").split(/\r?\n/);
    const isDevPage = r.startsWith("src/app/(dev)/design-system/");
    lines.forEach((line, i) => {
      for (const [re, what] of GRADIENT_RULES) if (re.test(line)) problems.push(`${r}:${i + 1}  gradient rule - ${what}: ${line.trim().slice(0, 100)}`);
      if (/\.tsx$/.test(f) && !r.startsWith("src/styles/") && !isDevPage && !RAW_COLOR_ALLOWED_FILES.has(r) && !line.includes("design-allow-raw") && RAW_COLOR.test(line))
        problems.push(`${r}:${i + 1}  raw colour (use a token class/variable): ${line.trim().slice(0, 100)}`);
    });
  }

  // (c) generated output is current
  const tokens = loadTokens();
  const expect = [[TOKENS_CSS, buildCss(tokens)], [THEME_COLOR_TS, buildThemeColorTs(tokens)]];
  for (const [file, want] of expect) {
    const have = existsSync(file) ? readFileSync(file, "utf8").replace(/\r\n/g, "\n") : "";
    if (have !== want) problems.push(`${rel(file)} is out of date - run \`npm run tokens:build\``);
  }

  // (d) every semantic colour has a Tailwind mapping
  const globals = readFileSync(join(SRC, "app/globals.css"), "utf8");
  if (!/@import\s+["']\.\.\/styles\/tokens\.css["']/.test(globals)) problems.push("src/app/globals.css must @import ../styles/tokens.css");
  for (const n of model(tokens).semNames) {
    if (n.startsWith("shadow-") || n === "overlay") continue;
    if (!new RegExp(`--color-${n}\\s*:\\s*var\\(--${n}\\)`).test(globals)) problems.push(`globals.css @theme is missing --color-${n}: var(--${n})`);
  }

  // (e) contrast
  for (const f of runContrast(tokens).failures) problems.push(`contrast: ${f}`);
  return problems;
}

if (isMain(import.meta.url)) {
  const problems = run();
  if (problems.length) {
    console.error(`design check: ${problems.length} problem(s)\n  ` + problems.join("\n  "));
    process.exit(1);
  }
  console.log("design check: OK (no gradients, no raw colours, tokens.css current, contrast AA)");
}
