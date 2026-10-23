import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const THEME_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "themes");
const BUILTIN = ["dark", "light"];

export function loadTheme(nameOrPath = "dark") {
  const file = BUILTIN.includes(nameOrPath) ? path.join(THEME_DIR, `${nameOrPath}.json`) : nameOrPath;
  const theme = JSON.parse(readFileSync(file, "utf8"));
  for (const key of ["surfaces", "edges", "categories"]) {
    if (!theme[key] || typeof theme[key] !== "object") throw new Error(`theme ${file}: missing "${key}"`);
  }
  return theme;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

// Linear sRGB-space mix; good enough for tinted fills, not for perceptual ramps.
export function mix(a, b, t) {
  const [ra, ga, ba] = hexToRgb(a);
  const [rb, gb, bb] = hexToRgb(b);
  const c = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${c(ra, rb)}${c(ga, gb)}${c(ba, bb)}`;
}

export function toHsl(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

export function fromHsl([h, s, l]) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${[f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, "0")).join("")}`;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Pastel that keeps the hue: lightness pulled to a shared level, saturation
// clamped into a band. Mixing toward a warm ink instead would turn cool, dull
// hues (slate, mauve) grey; this keeps every category recognisable.
export function pastelize(hex, { l: [l0, l1], s: [s0, s1] }) {
  const [h, s, l] = toHsl(hex);
  return fromHsl([h, clamp(s * 0.85, s0, s1), clamp(l, l0, l1)]);
}

export function categoryColor(theme, category) {
  if (!category) return theme.surfaces.muted;
  if (category.startsWith("#")) return category;
  return theme.categories[category] ?? theme.surfaces.muted;
}

// Every colour is resolved to hex here: librsvg and GitHub's <img> sandbox do
// not reliably resolve CSS custom properties, so the SVG carries no var().
export function themeCss(theme, categories, scope = "") {
  const s = theme.surfaces;
  const e = theme.edges;
  const p = (sel) => sel.split(",").map((x) => `${scope}${scope ? " " : ""}${x.trim()}`).join(",");
  const rules = [
    [".bb-canvas", `fill:${s.canvas}`],
    [".bb-title", `fill:${s.text}`],
    [".bb-subtitle,.bb-zone-sub,.bb-copy", `fill:${s.muted}`],
    [".bb-zone-title", `fill:${s.text}`],
    [".bb-node-box", `fill:${s.panel};stroke:${s.border}`],
    [".bb-node-title", `fill:${s.text}`],
    [".bb-hint", `fill:${s.muted}`],
    [".bb-badge", `fill:${s.raised};stroke:${s.border}`],
    [".bb-badge-text", `fill:${s.text}`],
    [".bb-edge.data", `stroke:${e.data}`],
    [".bb-edge.control", `stroke:${e.control}`],
    [".bb-edge.failure", `stroke:${e.failure}`],
    [".bb-arrow.data", `fill:${e.data}`],
    [".bb-arrow.control", `fill:${e.control}`],
    [".bb-arrow.failure", `fill:${e.failure}`],
    [".bb-label-bg", `fill:${s.canvas};stroke:${s.border}`],
    [".bb-label.data", `fill:${s.text}`],
    [".bb-label.control", `fill:${e.control}`],
    [".bb-label.failure", `fill:${e.failure}`],
    [".bb-flow", `stroke:${s.text}`],
    [".bb-legend-text", `fill:${s.muted}`],
  ];
  for (const [id, cat] of Object.entries(categories)) {
    const c = categoryColor(theme, cat.color ?? id);
    const zoneFill = mix(s.canvas, c, theme.mode === "dark" ? 0.07 : 0.06);
    const zoneStroke = mix(s.canvas, c, theme.mode === "dark" ? 0.45 : 0.55);
    // Palette rule: low-luminance accents are for fills, not small text, so
    // kicker text is lifted toward the text colour while fills stay exact.
    const textTone = theme.mode === "dark" ? mix(c, s.text, 0.3) : c;
    rules.push(
      [`.cat-${id} .bb-band,.bb-key.cat-${id}`, `fill:${c};stroke:${c}`],
      [`.cat-${id} .bb-kicker`, `fill:${textTone}`],
      [`.bb-zone.cat-${id}`, `fill:${zoneFill};stroke:${zoneStroke}`],
      [`.cat-${id} .bb-zone-kicker`, `fill:${textTone}`],
      [`.cat-${id}.is-selected .bb-node-box,.cat-${id}.is-highlighted .bb-node-box`, `stroke:${c}`],
    );
  }
  return rules.map(([sel, decl]) => `${p(sel)}{${decl}}`).join("\n");
}
