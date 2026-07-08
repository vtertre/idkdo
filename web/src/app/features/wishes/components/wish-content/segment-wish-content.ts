export type WishContentSegment =
  | { readonly kind: "line-break" }
  | { readonly kind: "link"; readonly url: string }
  | { readonly kind: "text"; readonly text: string };

export function segmentWishContent(content: string): WishContentSegment[] {
  const segments: WishContentSegment[] = [];
  const lines = content.split(/\r\n|\r|\n/u);

  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) {
      segments.push({ kind: "line-break" });
    }

    segmentLine(line, segments);
  });

  return segments;
}

function segmentLine(line: string, segments: WishContentSegment[]): void {
  const urlPattern = /https?:\/\/[^\s]+/giu;
  let cursor = 0;

  for (const match of line.matchAll(urlPattern)) {
    const matchIndex = match.index;
    if (matchIndex === undefined) {
      continue;
    }

    pushText(segments, line.slice(cursor, matchIndex));

    const rawUrl = match[0];
    const { trailingText, url } = trimTrailingPunctuation(rawUrl);
    segments.push({ kind: "link", url });
    pushText(segments, trailingText);
    cursor = matchIndex + rawUrl.length;
  }

  pushText(segments, line.slice(cursor));
}

function trimTrailingPunctuation(rawUrl: string): {
  readonly trailingText: string;
  readonly url: string;
} {
  let url = rawUrl;
  let trailingText = "";

  while (/[.,;:!?)]/u.test(url.at(-1) ?? "")) {
    trailingText = `${url.at(-1) ?? ""}${trailingText}`;
    url = url.slice(0, -1);
  }

  return { trailingText, url };
}

function pushText(segments: WishContentSegment[], text: string): void {
  if (text.length > 0) {
    segments.push({ kind: "text", text });
  }
}
