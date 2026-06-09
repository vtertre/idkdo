import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "./app.js";
import type { ServerEnvironment } from "./configuration/environment.js";

const testEnvironment: ServerEnvironment = {
  databaseUrl: "postgres://idkdo:idkdo@localhost:5432/idkdo",
  host: "127.0.0.1",
  logLevel: "silent",
  nodeEnv: "test",
  port: 3000,
};

describe("app integration", () => {
  let app: FastifyInstance | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("serves the health endpoint", async () => {
    app = buildApp({ environment: testEnvironment });

    const response = await app.inject({
      method: "GET",
      url: "/api/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toBe("application/json; charset=utf-8");
    expect(response.body).toBe('{"service":"idkdo-api","status":"ok"}');
  });
});
