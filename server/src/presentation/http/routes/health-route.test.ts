import { describe, expect, it } from "vitest";

import { getHealthResponse } from "./health-route.js";

describe("health route", () => {
  it("returns the health response contract", () => {
    expect(getHealthResponse()).toEqual({
      service: "idkdo-api",
      status: "ok",
    });
  });
});
