import path from "node:path";
import { basenameOf } from "./export.mjs";

// Embeds that work where Mermaid does not: GitHub renders <img> SVGs with
// their CSS animation intact, and <picture> follows the viewer's theme.
export function embedSnippets(file, { outDir, repoRoot = process.cwd() } = {}) {
  const base = basenameOf(file);
  const dir = path.relative(repoRoot, path.resolve(outDir ?? path.dirname(file))).split(path.sep).join("/") || ".";
  const p = (name) => `${dir}/${name}`;
  return `<!-- GitHub README: theme-aware, animated -->
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="${p(`${base}.dark.svg`)}">
  <img alt="${base} architecture" src="${p(`${base}.light.svg`)}">
</picture>

<!-- Link the image to the interactive page (GitHub Pages / local) -->
[![${base}](${p(`${base}.dark.svg`)})](${p(`${base}.html`)})

<!-- Markdown / MARP slide (raster for PDF/PPTX export) -->
![${base} w:1100](${p(`${base}.dark.webp`)})

<!-- MARP, theme-matched SVG -->
![bg contain](${p(`${base}.light.svg`)})
`;
}
