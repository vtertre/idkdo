import { describe, expect, it } from "vitest";

import { segmentWishContent } from "./segment-wish-content";

describe("segmentWishContent", () => {
  it("returns plain text as one text segment", () => {
    expect(segmentWishContent("Chocolat noir")).toEqual([
      { kind: "text", text: "Chocolat noir" },
    ]);
  });

  it("keeps line breaks as explicit segments", () => {
    expect(segmentWishContent("Ligne 1\nLigne 2\r\nLigne 3")).toEqual([
      { kind: "text", text: "Ligne 1" },
      { kind: "line-break" },
      { kind: "text", text: "Ligne 2" },
      { kind: "line-break" },
      { kind: "text", text: "Ligne 3" },
    ]);
  });

  it("detects http and https URLs inside text", () => {
    expect(segmentWishContent("Voir https://example.com/id ici")).toEqual([
      { kind: "text", text: "Voir " },
      { kind: "link", url: "https://example.com/id" },
      { kind: "text", text: " ici" },
    ]);
  });

  it("moves trailing punctuation back into text", () => {
    expect(segmentWishContent("Voir https://example.com/id).")).toEqual([
      { kind: "text", text: "Voir " },
      { kind: "link", url: "https://example.com/id" },
      { kind: "text", text: ")." },
    ]);
  });

  it("keeps HTML-looking content as text", () => {
    expect(segmentWishContent("<b>bold</b> <script>alert(1)</script>")).toEqual([
      { kind: "text", text: "<b>bold</b> <script>alert(1)</script>" },
    ]);
  });

  it("does not link non-http schemes", () => {
    expect(segmentWishContent("javascript:alert(1)")).toEqual([
      { kind: "text", text: "javascript:alert(1)" },
    ]);
  });
});
