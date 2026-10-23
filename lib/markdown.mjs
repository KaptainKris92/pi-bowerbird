// Minimal, escape-first Markdown for node details: paragraphs, #### headings,
// "-" lists, `code`, **bold**, and [links](path). Anything else stays text.
import { esc } from "./render-svg.mjs";

export function inline(text, rewriteHref = (h) => h) {
  let s = esc(text);
  s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const raw = href.replace(/&amp;/g, "&");
    if (/^\s*javascript:/i.test(raw)) return label;
    return `<a href="${esc(rewriteHref(raw))}">${label}</a>`;
  });
  return s;
}

export function markdown(src, rewriteHref) {
  const blocks = String(src ?? "").replace(/\r\n/g, "\n").split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split("\n").filter((l) => l.trim());
      if (!lines.length) return "";
      const heading = lines[0].match(/^#{1,6}\s+(.*)$/);
      if (heading && lines.length === 1) return `<h4>${inline(heading[1], rewriteHref)}</h4>`;
      if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
        return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*]\s+/, ""), rewriteHref)}</li>`).join("")}</ul>`;
      }
      if (heading) return `<h4>${inline(heading[1], rewriteHref)}</h4>` + markdown(lines.slice(1).join("\n"), rewriteHref);
      return `<p>${inline(lines.join(" "), rewriteHref)}</p>`;
    })
    .join("\n");
}
