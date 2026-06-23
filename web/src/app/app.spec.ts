import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { App } from "./app";

describe("App", () => {
  it("renders the application frame and router outlet", () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    });

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain("idkdo");
    expect(element.querySelector("router-outlet")).not.toBeNull();
  });
});
