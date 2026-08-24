import { stripInlineFormatting } from "@/utils/inlineFormatting";

/**
 * Get the first sentence (or first ~160 chars) from article content_blocks for use as meta description when subtitle is null.
 */
export function getFirstSentenceFromContent(
  contentBlocks: Array<{ paragraph?: string; subtitle?: string | null }> | null | undefined
): string | null {
  if (!contentBlocks?.length) return null;
  const first = contentBlocks.find((b) => b.paragraph?.trim());
  let text = first?.paragraph?.trim();
  if (!text) return null;
  // Prefer first non-heading line for descriptions
  const firstLine =
    text
      .split(/\n/)
      .map((line) => line.trim())
      .find(Boolean) || text;
  text = stripInlineFormatting(
    firstLine.replace(/^#{1,3}\s+/, "").replace(/^>\s?/, "").trim(),
  );
  if (!text) return null;
  // First sentence: up to first . ! ? or else first 160 chars (meta description length)
  const match = text.match(/^[^.!?]*[.!?]?/);
  const firstSentence = match ? match[0].trim() : text.slice(0, 160).trim();
  return firstSentence.length > 0 ? firstSentence : null;
}
