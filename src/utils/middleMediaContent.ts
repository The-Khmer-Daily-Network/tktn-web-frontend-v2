/**
 * Encode mid image/video as markers inside editor markdown so placement
 * follows the cursor. On save we split into content_blocks + middle_* fields
 * for the existing API / public renderer.
 */

import { resolveMediaUrl, resolveMediaUrlOptional } from "@/utils/resolveMediaUrl";

export type MiddleMediaKind = "image" | "video";

export type MiddleMedia = {
  kind: MiddleMediaKind;
  url: string;
  name: string | null;
};

const MID_IMAGE_LINE =
  /^\[\[mid-image:([^\]|]+)(?:\|([^\]]*))?\]\]$/;
const MID_VIDEO_LINE =
  /^\[\[mid-video:([^\]|]+)(?:\|([^\]]*))?\]\]$/;

export function encodeMiddleImageMarker(
  url: string,
  name?: string | null,
): string {
  const safeUrl = url.trim();
  const safeName = (name || "").trim();
  return safeName
    ? `[[mid-image:${safeUrl}|${safeName}]]`
    : `[[mid-image:${safeUrl}]]`;
}

export function encodeMiddleVideoMarker(
  url: string,
  name?: string | null,
): string {
  const safeUrl = url.trim();
  const safeName = (name || "").trim();
  return safeName
    ? `[[mid-video:${safeUrl}|${safeName}]]`
    : `[[mid-video:${safeUrl}]]`;
}

export function isMiddleImageMarker(line: string): boolean {
  return MID_IMAGE_LINE.test(line.trim());
}

export function isMiddleVideoMarker(line: string): boolean {
  return MID_VIDEO_LINE.test(line.trim());
}

export function isMiddleMediaMarker(line: string): boolean {
  return isMiddleImageMarker(line) || isMiddleVideoMarker(line);
}

export function parseMiddleMediaMarker(line: string): MiddleMedia | null {
  const image = line.trim().match(MID_IMAGE_LINE);
  if (image) {
    return {
      kind: "image",
      url: image[1].trim(),
      name: image[2]?.trim() ? image[2].trim() : null,
    };
  }
  const video = line.trim().match(MID_VIDEO_LINE);
  if (video) {
    return {
      kind: "video",
      url: video[1].trim(),
      name: video[2]?.trim() ? video[2].trim() : null,
    };
  }
  return null;
}

/** Strip markers and empty lines for "has real text" checks. */
export function contentWithoutMiddleMedia(content: string): string {
  return (content || "")
    .split(/\n/)
    .filter((line) => !isMiddleMediaMarker(line))
    .join("\n")
    .trim();
}

export function extractMiddleMedia(content: string): MiddleMedia | null {
  for (const line of (content || "").split(/\n/)) {
    const media = parseMiddleMediaMarker(line);
    if (media) return media;
  }
  return null;
}

/**
 * Split editor content around the first mid-media marker into before/after
 * paragraphs (newlines preserved as paragraph breaks).
 */
export function splitContentAroundMiddleMedia(content: string): {
  before: string;
  after: string;
  media: MiddleMedia | null;
} {
  const lines = (content || "").split(/\n/);
  const index = lines.findIndex((line) => isMiddleMediaMarker(line));
  if (index < 0) {
    return { before: (content || "").trim(), after: "", media: null };
  }
  const media = parseMiddleMediaMarker(lines[index]);
  const before = lines.slice(0, index).join("\n").trim();
  const after = lines.slice(index + 1).join("\n").trim();
  return { before, after, media };
}

/**
 * Rebuild editor content from API blocks + middle media field.
 * Middle media is placed after the first content block (matches public render).
 */
export function joinContentWithMiddleMedia(params: {
  blocks: Array<{ paragraph?: string | null }>;
  middleImageUrl?: string | null;
  middleImageName?: string | null;
  middleVideoUrl?: string | null;
  middleVideoName?: string | null;
}): string {
  const blocks = params.blocks || [];
  const paragraphs = blocks
    .map((b) => (b.paragraph || "").trim())
    .filter(Boolean);

  let marker: string | null = null;
  if (params.middleVideoUrl) {
    marker = encodeMiddleVideoMarker(
      resolveMediaUrl(params.middleVideoUrl),
      params.middleVideoName,
    );
  } else if (params.middleImageUrl) {
    marker = encodeMiddleImageMarker(
      resolveMediaUrl(params.middleImageUrl),
      params.middleImageName,
    );
  }

  if (!marker) {
    return paragraphs.join("\n\n");
  }

  if (paragraphs.length === 0) {
    return marker;
  }

  if (paragraphs.length === 1) {
    // Single block historically rendered middle media after the whole body.
    return `${paragraphs[0]}\n\n${marker}`;
  }

  const [first, ...rest] = paragraphs;
  return `${first}\n\n${marker}\n\n${rest.join("\n\n")}`;
}

export function buildContentBlocksFromEditor(params: {
  content: string;
  blockSubtitle?: string | null;
}): {
  content_blocks: Array<{ subtitle: string | null; paragraph: string }>;
  middle_image_url: string | null;
  middle_image_name: string | null;
  middle_video_url: string | null;
  middle_video_name: string | null;
} {
  const { before, after, media } = splitContentAroundMiddleMedia(params.content);
  const subtitle = (params.blockSubtitle || "").trim() || null;
  const content_blocks: Array<{ subtitle: string | null; paragraph: string }> =
    [];

  if (before) {
    content_blocks.push({ subtitle, paragraph: before });
  }
  if (after) {
    content_blocks.push({
      subtitle: content_blocks.length === 0 ? subtitle : null,
      paragraph: after,
    });
  }
  if (content_blocks.length === 0 && !media) {
    content_blocks.push({ subtitle, paragraph: "" });
  }
  // Marker-only: keep one empty-ish block so API still has structure? Prefer requiring text.
  if (content_blocks.length === 0 && media) {
    content_blocks.push({ subtitle, paragraph: "" });
  }

  return {
    content_blocks,
    middle_image_url:
      media?.kind === "image" ? resolveMediaUrlOptional(media.url) : null,
    middle_image_name: media?.kind === "image" ? media.name : null,
    middle_video_url:
      media?.kind === "video" ? resolveMediaUrlOptional(media.url) : null,
    middle_video_name: media?.kind === "video" ? media.name : null,
  };
}
