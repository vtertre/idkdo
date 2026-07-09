import { TestBed } from "@angular/core/testing";

import { WishContent } from "./wish-content";

describe("WishContent", () => {
  it("renders http URLs as safe links", async () => {
    const fixture = TestBed.createComponent(WishContent);
    fixture.componentRef.setInput("content", "Voir https://example.com/id.");

    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const link = element.querySelector<HTMLAnchorElement>("a");
    expect(link?.href).toBe("https://example.com/id");
    expect(link?.target).toBe("_blank");
    expect(link?.rel).toBe("noopener noreferrer");
    expect(element.textContent).toContain("Voir");
    expect(element.textContent).toContain("https://example.com/id");
    expect(element.textContent).toContain(".");
  });

  it("renders HTML-looking content as inert text", async () => {
    const fixture = TestBed.createComponent(WishContent);
    fixture.componentRef.setInput(
      "content",
      "<b>bold</b>\n<script>alert(1)</script>",
    );

    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain("<b>bold</b>");
    expect(element.textContent).toContain("<script>alert(1)</script>");
    expect(element.querySelector("b")).toBeNull();
    expect(element.querySelector("script")).toBeNull();
    expect(element.querySelectorAll("br")).toHaveLength(1);
  });
});
