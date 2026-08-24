import type { ReactNode } from "react";

type ParsedToken =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "link"; text: string; href: string };

type RenderInlineOptions = {
  linkClassName?: string;
  disableLinks?: boolean;
};

const INLINE_PATTERN_SOURCE =
  "\\*\\*(.+?)\\*\\*|\\*(.+?)\\*|\\[([^\\]]+)\\]\\(([^)]+)\\)";

export function normalizeLinkUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

export function stripInlineFormatting(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
}

function tokenizeInlineFormatting(text: string): ParsedToken[] {
  const tokens: ParsedToken[] = [];
  const pattern = new RegExp(INLINE_PATTERN_SOURCE, "g");
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const [fullMatch, boldText, italicText, linkText, linkUrl] = match;
    const start = match.index ?? 0;

    if (start > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, start) });
    }

    if (boldText) {
      tokens.push({ type: "bold", value: boldText });
    } else if (italicText) {
      tokens.push({ type: "italic", value: italicText });
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

function renderTokens(
  text: string,
  options: Required<Pick<RenderInlineOptions, "linkClassName" | "disableLinks">>,
  keyPrefix: string,
): ReactNode[] {
  return tokenizeInlineFormatting(text).map((token, index) => {
    const key = `${keyPrefix}-${index}`;

    if (token.type === "bold") {
      return <strong key={key}>{renderTokens(token.value, options, key)}</strong>;
    }

    if (token.type === "italic") {
      return <em key={key}>{renderTokens(token.value, options, key)}</em>;
    }

    if (token.type === "link") {
      const children = renderTokens(token.text, options, key);
      if (options.disableLinks) {
        return <span key={key}>{children}</span>;
      }
      return (
        <a
          key={key}
          href={token.href}
          target="_blank"
          rel="noopener noreferrer"
          className={options.linkClassName}
        >
          {children}
        </a>
      );
    }

    return <span key={key}>{token.value}</span>;
  });
}

export function renderInlineFormatting(
  text: string,
  options: RenderInlineOptions = {},
): ReactNode[] {
  return renderTokens(
    text,
    {
      linkClassName:
        options.linkClassName ??
        "text-blue-700 underline hover:text-blue-800",
      disableLinks: options.disableLinks ?? false,
    },
    "t",
  );
}

/** Bold/italic for card excerpts without nested <a> inside parent <Link>s. */
export function renderInlineExcerpt(text: string): ReactNode[] {
  return renderInlineFormatting(text, { disableLinks: true });
}
