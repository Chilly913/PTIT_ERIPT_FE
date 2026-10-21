// WCAG AA contrast + colour-blind distinguishability checks for the semantic palette.
//   node design/contrast.mjs [--verbose]   (also run by check.mjs)
import { contrast, hexToRgb, isMain, loadTokens, model, resolveSemantic } from "./lib.mjs";

const TEXT = 4.5; // WCAG 1.4.3 normal text
const UI = 3; // WCAG 1.4.11 non-text contrast
// [foreground, background, min ratio]
const PAIRS = [
  ["foreground", "background", TEXT], ["foreground", "surface", TEXT], ["foreground", "surface-muted", TEXT],
  ["muted", "background", TEXT], ["muted", "surface", TEXT], ["muted", "surface-muted", TEXT],
  ["primary", "background", TEXT], ["primary", "surface", TEXT], ["primary", "surface-muted", TEXT],
  ["primary-foreground", "primary", TEXT], ["primary-foreground", "primary-hover", TEXT], ["primary-foreground", "primary-active", TEXT],
  ["primary-soft-foreground", "primary-soft", TEXT], ["primary-soft-foreground", "primary-soft-hover", TEXT],
  ["success", "surface", TEXT], ["success", "background", TEXT], ["success", "success-soft", TEXT],
  ["warning", "surface", TEXT], ["warning", "background", TEXT], ["warning", "warning-soft", TEXT],
  ["danger", "surface", TEXT], ["danger", "background", TEXT], ["danger", "danger-soft", TEXT],
  ["info", "surface", TEXT], ["info", "background", TEXT], ["info", "info-soft", TEXT],
  ["danger-foreground", "danger", TEXT], ["danger-foreground", "danger-hover", TEXT], ["danger-foreground", "danger-active", TEXT],
  ["background", "foreground", TEXT], // tooltip
  ["chart-axis", "surface", TEXT],
  // non-text
  ["ring", "surface", UI], ["ring", "background", UI],
  ["border-control", "surface", UI], ["border-control", "surface-muted", UI],
  ["chart-1", "surface", UI], ["chart-2", "surface", UI], ["chart-3", "surface", UI], ["chart-4", "surface", UI],
  ["primary", "surface", UI],
];

// Colour-vision-deficiency simulation (Machado 2009, severity 1.0), linear RGB.
const CVD = {
  deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};
const toLin = (c) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
function lab(rgbLin) {
  const [r, g, b] = rgbLin;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const simulate = (hex, mat) => {
  const l = hexToRgb(hex).map(toLin);
  return mat.map((row) => Math.min(1, Math.max(0, row[0] * l[0] + row[1] * l[1] + row[2] * l[2])));
};
const dE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const MIN_CVD_DELTA_E = 15;

export function runContrast(tokens = loadTokens(), { withDark = process.argv.includes("--with-dark") } = {}) {
  const m = model(tokens);
  const failures = [];
  const rows = [];
  for (const theme of withDark ? ["light", "dark"] : ["light"]) {
    const val = (n) => resolveSemantic(n, theme, m);
    for (const [fg, bg, min] of PAIRS) {
      const r = contrast(val(fg), val(bg));
      rows.push({ theme, pair: `${fg} on ${bg}`, ratio: r, min });
      if (r < min) failures.push(`${theme}: ${fg} (${val(fg)}) on ${bg} (${val(bg)}) = ${r.toFixed(2)} < ${min}`);
    }
    const ch = [1, 2, 3, 4].map((i) => val(`chart-${i}`));
    for (const [name, mat] of [["normal", null], ...Object.entries(CVD)]) {
      const labs = ch.map((h) => lab(mat ? simulate(h, mat) : hexToRgb(h).map(toLin)));
      for (let i = 0; i < 4; i++)
        for (let j = i + 1; j < 4; j++) {
          const d = dE(labs[i], labs[j]);
          rows.push({ theme, pair: `chart-${i + 1} vs chart-${j + 1} (${name}) dE`, ratio: d, min: MIN_CVD_DELTA_E });
          if (d < MIN_CVD_DELTA_E) failures.push(`${theme}: chart-${i + 1} vs chart-${j + 1} under ${name}: deltaE ${d.toFixed(1)} < ${MIN_CVD_DELTA_E}`);
        }
    }
  }
  return { failures, rows };
}

if (isMain(import.meta.url)) {
  const { failures, rows } = runContrast();
  if (process.argv.includes("--verbose"))
    for (const r of rows) console.log(`${r.theme.padEnd(5)} ${r.pair.padEnd(52)} ${r.ratio.toFixed(2)} (min ${r.min})${r.ratio < r.min ? "  FAIL" : ""}`);
  console.log(failures.length ? `contrast: ${failures.length} failure(s)\n  ${failures.join("\n  ")}` : `contrast: ${rows.length} checks OK`);
  process.exit(failures.length ? 1 : 0);
}
