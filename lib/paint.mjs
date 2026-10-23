// Paint layer: gradients, patterns, and filters that give the diagrams depth.
// Everything is plain SVG paint servers and filter primitives that librsvg
// and GitHub's <img> sandbox both support. Ids are prefixed per theme so one
// SVG can carry both themes and switch with a media query or [data-theme].
import { categoryColor, mix } from "./themes.mjs";

const pid = (theme, name) => `bb-${theme.id}-${name}`;
const stop = (offset, color, opacity = 1) => `<stop offset="${offset}" stop-color="${color}" stop-opacity="${opacity}"/>`;

function catList(theme, categories) {
  return Object.entries(categories).map(([id, cat]) => [id, categoryColor(theme, cat.color ?? id)]);
}

export function paintDefs(theme, categories, { iso = false } = {}) {
  const s = theme.surfaces;
  const dark = theme.mode === "dark";
  const cats = catList(theme, categories);
  const accentA = theme.categories.sage ?? s.muted;
  const accentB = theme.categories.rust ?? s.muted;
  const out = [];

  // Canvas: two soft glows over a faint dot grid.
  out.push(`<radialGradient id="${pid(theme, "glow-a")}" cx="0.12" cy="0" r="0.75">${stop(0, accentA, dark ? 0.13 : 0.1)}${stop(1, accentA, 0)}</radialGradient>`);
  out.push(`<radialGradient id="${pid(theme, "glow-b")}" cx="0.95" cy="1" r="0.7">${stop(0, accentB, dark ? 0.09 : 0.07)}${stop(1, accentB, 0)}</radialGradient>`);
  out.push(`<pattern id="${pid(theme, "dots")}" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="1" fill="${mix(s.canvas, s.text, dark ? 0.1 : 0.12)}"/></pattern>`);
  out.push(`<pattern id="${pid(theme, "hatch")}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="${s.canvas}"/><rect width="2.4" height="6" fill="${s.text}"/></pattern>`);

  // Cards: a faint vertical sheen, and a drop shadow.
  out.push(`<linearGradient id="${pid(theme, "card")}" x1="0" y1="0" x2="0" y2="1">${stop(0, mix(s.panel, s.text, dark ? 0.06 : 0))}${stop(1, s.panel)}</linearGradient>`);
  const shadow = (name, dy, blur, opacity) =>
    `<filter id="${pid(theme, name)}" x="-25%" y="-25%" width="150%" height="170%" color-interpolation-filters="sRGB">` +
    `<feGaussianBlur in="SourceAlpha" stdDeviation="${blur}"/><feOffset dy="${dy}" result="o"/>` +
    `<feFlood flood-color="${dark ? "#000000" : "#3b2f26"}" flood-opacity="${opacity}"/><feComposite in2="o" operator="in"/>` +
    `<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  out.push(shadow("shadow", dark ? 10 : 8, dark ? 12 : 10, dark ? 0.55 : 0.13));
  out.push(shadow("shadow-sm", 3, 4, dark ? 0.45 : 0.1));
  out.push(`<filter id="${pid(theme, "glow")}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${dark ? 3.2 : 2}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  out.push(`<filter id="${pid(theme, "soft")}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>`);

  for (const [id, c] of cats) {
    // Category wash across the left of a card, and a lit zone floor.
    out.push(`<linearGradient id="${pid(theme, `wash-${id}`)}" x1="0" y1="0" x2="1" y2="0">${stop(0, c, dark ? 0.2 : 0.11)}${stop(0.55, c, 0)}</linearGradient>`);
    out.push(`<linearGradient id="${pid(theme, `zone-${id}`)}" x1="0" y1="0" x2="0" y2="1">${stop(0, mix(s.canvas, c, dark ? 0.15 : 0.11))}${stop(0.45, mix(s.canvas, c, dark ? 0.06 : 0.05))}${stop(1, mix(s.canvas, c, dark ? 0.035 : 0.03))}</linearGradient>`);
    if (iso) {
      const roofTop = mix(s.panel, c, dark ? 0.5 : 0.3), roofBot = mix(s.panel, c, dark ? 0.32 : 0.2);
      const leftTop = mix(s.canvas, c, dark ? 0.66 : 0.55), leftBot = mix(s.canvas, c, dark ? 0.42 : 0.42);
      const rightTop = mix(s.canvas, c, dark ? 0.44 : 0.36), rightBot = mix(s.canvas, c, dark ? 0.26 : 0.26);
      out.push(`<linearGradient id="${pid(theme, `roof-${id}`)}" x1="0" y1="0" x2="1" y2="1">${stop(0, roofTop)}${stop(1, roofBot)}</linearGradient>`);
      out.push(`<linearGradient id="${pid(theme, `left-${id}`)}" x1="0" y1="0" x2="0" y2="1">${stop(0, leftTop)}${stop(1, leftBot)}</linearGradient>`);
      out.push(`<linearGradient id="${pid(theme, `right-${id}`)}" x1="0" y1="0" x2="0" y2="1">${stop(0, rightTop)}${stop(1, rightBot)}</linearGradient>`);
    }
  }
  return `<defs>${out.join("")}</defs>`;
}

export function paintCss(theme, categories, scope = "", { iso = false } = {}) {
  const s = theme.surfaces;
  const dark = theme.mode === "dark";
  const p = (sel) => sel.split(",").map((x) => `${scope}${scope ? " " : ""}${x.trim()}`).join(",");
  const url = (name) => `url(#${pid(theme, name)})`;
  const rules = [
    [".bb-accent", `fill:${theme.categories.sage ?? s.text}`],
    [".bb-bg-glow-a", `fill:${url("glow-a")}`],
    [".bb-bg-glow-b", `fill:${url("glow-b")}`],
    [".bb-bg-dots", `fill:${url("dots")}`],
    [".bb-node-box", `fill:${url("card")};filter:${url("shadow")}`],
    [".bb-node.status-planned .bb-node-box", `fill:${s.canvas};fill-opacity:.55;filter:none`],
    [".bb-node-bevel", `stroke:${mix(s.panel, s.text, dark ? 0.16 : 0)};stroke-opacity:${dark ? 1 : 0}`],
    [".bb-band", `filter:${dark ? url("glow") : "none"}`],
    [".bb-edge-glow", `stroke-opacity:${dark ? 0.16 : 0.08}`],
    [".bb-flow", `filter:${dark ? url("glow") : "none"}`],
    [".bb-label-bg", `fill:${mix(s.canvas, s.panel, dark ? 0.85 : 0.6)};filter:${url("shadow-sm")}`],
    [".bb-meter-hatch", `fill:${url("hatch")}`],
    [".bb-meter-solid", `fill:${s.text}`],
    [".bb-meter-track", `fill:${mix(s.canvas, s.text, dark ? 0.07 : 0.06)};stroke:${s.border}`],
    [".bb-meter-big", `fill:${s.text}`],
    [".bb-legend-bg", `fill:${mix(s.canvas, s.panel, dark ? 0.45 : 0.5)};stroke:${s.border};stroke-opacity:.6`],
    [".bb-badge.is-implemented", `fill:${s.text};stroke:${s.text}`],
    [".bb-status.is-implemented .bb-badge-text", `fill:${s.canvas}`],
    [".bb-status.is-implemented .bb-dot-fill", `fill:${s.canvas}`],
    [".bb-zone-floor-grid", `stroke:${mix(s.canvas, s.text, dark ? 0.16 : 0.16)};stroke-opacity:.8`],
    [".iso-tag-bg", `fill:${mix(s.canvas, s.panel, dark ? 0.75 : 0.9)};fill-opacity:.94;stroke:${s.border};stroke-width:1.2;filter:${url("shadow-sm")}`],
    [".iso-shadow", `fill:${dark ? "#000000" : "#3b2f26"};fill-opacity:${dark ? 0.5 : 0.16};filter:${url("soft")}`],
  ];
  for (const [id, c] of catList(theme, categories)) {
    rules.push(
      [`.cat-${id} .bb-node-wash`, `fill:${url(`wash-${id}`)}`],
      [`.bb-zone.cat-${id}`, `fill:${url(`zone-${id}`)}`],
      [`.cat-${id} .bb-zone-accent`, `stroke:${c}`],
    );
    if (iso) {
      rules.push(
        [`.cat-${id} .iso-roof`, `fill:${url(`roof-${id}`)}`],
        [`.cat-${id} .iso-left`, `fill:${url(`left-${id}`)}`],
        [`.cat-${id} .iso-right`, `fill:${url(`right-${id}`)}`],
        [`.cat-${id} .iso-bevel`, `stroke:${mix(c, "#ffffff", dark ? 0.45 : 0.6)}`],
        [`.iso-tag.cat-${id} .iso-tag-bg`, `stroke:${mix(s.border, c, 0.7)}`],
      );
    }
  }
  return rules.map(([sel, decl]) => `${p(sel)}{${decl}}`).join("\n");
}
