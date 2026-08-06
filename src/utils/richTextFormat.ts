/**
 * Convert between TipTap HTML and the project's stored paragraph format:
 * - **bold**
 * - *italic*
 * - [text](url)
 * - # / ## / ### headings
 * - > blockquote
 * - [[mid-image:url|name]] / [[mid-video:url|name]] (block markers)
 * Newlines separate paragraphs (same as public article rendering).
 */

import { normalizeLinkUrl } from "@/utils/inlineFormatting";
import {
  encodeMiddleImageMarker,
  encodeMiddleVideoMarker,
  isMiddleMediaMarker,
  parseMiddleMediaMarker,
} from "@/utils/middleMediaContent";

export type ContentLine =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "quote"; text: string };

export function parseContentLines(paragraph?: string | null): ContentLine[] {
  return (paragraph || "")
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const quote = line.match(/^>\s?(.*)$/);
      if (quote) return { type: "quote" as const, text: quote[1] };

      const h3 = line.match(/^###\s+(.*)$/);
      if (h3) return { type: "heading" as const, level: 3 as const, text: h3[1] };
      const h2 = line.match(/^##\s+(.*)$/);
      if (h2) return { type: "heading" as const, level: 2 as const, text: h2[1] };
      const h1 = line.match(/^#\s+(.*)$/);
      if (h1) return { type: "heading" as const, level: 1 as const, text: h1[1] };
      return { type: "paragraph" as const, text: line };
    });
}

function applyInlineMarkdownToHtml(line: string): string {
  return escapeHtml(line)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_m, label: string, href: string) =>
        `<a href="${escapeAttr(normalizeLinkUrl(href))}">${label}</a>`,
    );
}

export function markdownToEditorHtml(markdown: string): string {
  const text = markdown ?? "";
  if (!text.trim()) return "<p></p>";

  const paragraphs = text.split(/\n+/);
  return paragraphs
    .map((line) => {
      const media = parseMiddleMediaMarker(line);
      if (media?.kind === "image") {
        return `<div data-middle-image data-src="${escapeAttr(media.url)}" data-name="${escapeAttr(media.name || "")}"></div>`;
      }
      if (media?.kind === "video") {
        return `<div data-middle-video data-src="${escapeAttr(media.url)}" data-name="${escapeAttr(media.name || "")}"></div>`;
      }

      const quote = line.match(/^>\s?(.*)$/);
      if (quote) {
        const html = applyInlineMarkdownToHtml(quote[1]);
        return `<blockquote><p>${html || "<br>"}</p></blockquote>`;
      }

      const h3 = line.match(/^###\s+(.*)$/);
      if (h3) return `<h3>${applyInlineMarkdownToHtml(h3[1]) || "<br>"}</h3>`;
      const h2 = line.match(/^##\s+(.*)$/);
      if (h2) return `<h2>${applyInlineMarkdownToHtml(h2[1]) || "<br>"}</h2>`;
      const h1 = line.match(/^#\s+(.*)$/);
      if (h1) return `<h1>${applyInlineMarkdownToHtml(h1[1]) || "<br>"}</h1>`;

      const html = applyInlineMarkdownToHtml(line);
      return `<p>${html || "<br>"}</p>`;
    })
    .join("");
}

export function editorHtmlToMarkdown(html: string): string {
  if (!html || html === "<p></p>") return "";

  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks: string[] = [];

  const walkInline = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? "";
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const inner = Array.from(el.childNodes).map(walkInline).join("");

    if (tag === "strong" || tag === "b") return `**${inner}**`;
    if (tag === "em" || tag === "i") return `*${inner}*`;
    if (tag === "a") {
      const href = normalizeLinkUrl(el.getAttribute("href") || "");
      return href ? `[${inner}](${href})` : inner;
    }
    if (tag === "br") return "\n";
    return inner;
  };

  doc.body.childNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (el.hasAttribute("data-middle-image") || el.querySelector?.("[data-middle-image]")) {
        const mediaEl = el.hasAttribute("data-middle-image")
          ? el
          : (el.querySelector("[data-middle-image]") as HTMLElement);
        const src = mediaEl.getAttribute("data-src") || "";
        const name = mediaEl.getAttribute("data-name") || null;
        if (src) blocks.push(encodeMiddleImageMarker(src, name));
        return;
      }

      if (el.hasAttribute("data-middle-video") || el.querySelector?.("[data-middle-video]")) {
        const mediaEl = el.hasAttribute("data-middle-video")
          ? el
          : (el.querySelector("[data-middle-video]") as HTMLElement);
        const src = mediaEl.getAttribute("data-src") || "";
        const name = mediaEl.getAttribute("data-name") || null;
        if (src) blocks.push(encodeMiddleVideoMarker(src, name));
        return;
      }

      if (tag === "h1" || tag === "h2" || tag === "h3") {
        const level = Number(tag[1]) as 1 | 2 | 3;
        const line = Array.from(el.childNodes).map(walkInline).join("").trim();
        blocks.push(`${"#".repeat(level)} ${line}`);
        return;
      }

      if (tag === "blockquote") {
        const paragraphs = Array.from(el.children).filter(
          (child) => (child as HTMLElement).tagName?.toLowerCase() === "p",
        ) as HTMLElement[];
        if (paragraphs.length > 0) {
          paragraphs.forEach((p) => {
            const line = Array.from(p.childNodes).map(walkInline).join("").trim();
            blocks.push(`> ${line}`);
          });
        } else {
          const line = Array.from(el.childNodes).map(walkInline).join("").trim();
          blocks.push(`> ${line}`);
        }
        return;
      }

      if (tag === "p" || tag === "div") {
        const line = Array.from(el.childNodes).map(walkInline).join("");
        if (isMiddleMediaMarker(line)) {
          blocks.push(line.trim());
          return;
        }
        blocks.push(line);
        return;
      }
    }
    const text = walkInline(node).trim();
    if (text) blocks.push(text);
  });

  return blocks.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, "&quot;");
}
