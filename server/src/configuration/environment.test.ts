import { describe, expect, it } from "vitest";

import { loadEnvironment } from "./environment.js";

const databaseUrl = "postgres://idkdo:idkdo@localhost:5432/idkdo";

describe("loadEnvironment", () => {
  it("applies development defaults", () => {
    expect(loadEnvironment({ DATABASE_URL: databaseUrl })).toEqual({
      databaseUrl,
      host: "0.0.0.0",
      logLevel: "info",
      nodeEnv: "development",
      port: 3000,
    });
  });

  it("parses supported overrides", () => {
    expect(
      loadEnvironment({
        DATABASE_URL: databaseUrl,
        HOST: "127.0.0.1",
        LOG_LEVEL: "debug",
        NODE_ENV: "test",
        PORT: "3100",
      }),
    ).toEqual({
      databaseUrl,
      host: "127.0.0.1",
      logLevel: "debug",
      nodeEnv: "test",
      port: 3100,
    });
  });

  it("requires DATABASE_URL", () => {
    expect(() => loadEnvironment({})).toThrowError(
      new Error("Invalid server environment: DATABASE_URL: DATABASE_URL is required."),
    );
  });

  it("reports invalid DATABASE_URL values", () => {
    expect(() => loadEnvironment({ DATABASE_URL: "not-a-url" })).toThrowError(
      new Error("Invalid server environment: DATABASE_URL: DATABASE_URL must be a valid URL."),
    );
  });

  it("reports non-Postgres DATABASE_URL values", () => {
    expect(() => loadEnvironment({ DATABASE_URL: "https://example.com" })).toThrowError(
      new Error(
        "Invalid server environment: DATABASE_URL: DATABASE_URL must use postgres:// or postgresql://.",
      ),
    );
  });

  it("reports invalid ports", () => {
    expect(() =>
      loadEnvironment({
        DATABASE_URL: databaseUrl,
        PORT: "70000",
      }),
    ).toThrowError(
      new Error("Invalid server environment: PORT: Too big: expected number to be <=65535"),
    );
  });
});
