import type { ReactNode } from "react";

type ParsedToken =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "link"; text: string; href: string };

const INLINE_PATTERN = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;

export function normalizeLinkUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

export function stripInlineFormatting(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
}

function tokenizeInlineFormatting(text: string): ParsedToken[] {
  const tokens: ParsedToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    const [fullMatch, boldText, linkText, linkUrl] = match;
    const start = match.index;

    if (start > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, start) });
    }

    if (boldText) {
      tokens.push({ type: "bold", value: boldText });
    } else if (linkText && linkUrl) {
      tokens.push({
        type: "link",
        text: linkText,
        href: normalizeLinkUrl(linkUrl),
      });
    } else {
      tokens.push({ type: "text", value: fullMatch });
    }

    lastIndex = start + fullMatch.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }

  return tokens;
}

export function renderInlineFormatting(
  text: string,
  linkClassName = "text-blue-700 underline hover:text-blue-800",
): ReactNode[] {
  return tokenizeInlineFormatting(text).map((token, index) => {
    if (token.type === "bold") {
      return <strong key={`b-${index}`}>{token.value}</strong>;
    }

    if (token.type === "link") {
      return (
        <a
          key={`l-${index}`}
          href={token.href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
        >
          {token.text}
        </a>
      );
    }

    return <span key={`t-${index}`}>{token.value}</span>;
  });
}
