import { createDatabaseClient, events, migrateDatabase } from "@idkdo/db";
import { Uuid } from "@idkdo/patterns";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import type { FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { buildApp } from "./app.js";
import type { ServerEnvironment } from "./configuration/environment.js";

const createEventResponseSchema = z.object({
  id: z.string().uuid(),
});

describe("event creation integration", () => {
  let app: FastifyInstance | undefined;
  let databaseClient: ReturnType<typeof createDatabaseClient> | undefined;
  let postgresContainer: StartedPostgreSqlContainer | undefined;
  let testEnvironment: ServerEnvironment | undefined;

  beforeAll(async () => {
    postgresContainer = await new PostgreSqlContainer("postgres:17-alpine").start();
    testEnvironment = {
      databaseUrl: postgresContainer.getConnectionUri(),
      host: "127.0.0.1",
      logLevel: "silent",
      nodeEnv: "test",
      port: 3000,
    };
    databaseClient = createDatabaseClient({
      databaseUrl: testEnvironment.databaseUrl,
      maxConnections: 1,
    });

    await migrateDatabase(databaseClient.db);
  }, 120_000);

  beforeEach(async () => {
    await databaseClient?.db.delete(events);
  });

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  afterAll(async () => {
    await databaseClient?.close();
    await postgresContainer?.stop();
    databaseClient = undefined;
    postgresContainer = undefined;
    testEnvironment = undefined;
  }, 120_000);

  it("persists an Event and returns the created id", async () => {
    if (!databaseClient || !testEnvironment) {
      throw new Error("Expected database client and test environment.");
    }

    app = buildApp({
      databaseClient,
      environment: testEnvironment,
    });

    const response = await app.inject({
      method: "POST",
      payload: { name: "Christmas 2026" },
      url: "/api/events",
    });

    expect(response.statusCode).toBe(201);

    const responseBody = createEventResponseSchema.parse(
      JSON.parse(response.body) as unknown,
    );
    const persistedEvents = await databaseClient.db.select().from(events);
    const persistedEvent = persistedEvents[0];

    expect(() => Uuid.parse(responseBody.id)).not.toThrow();
    expect(persistedEvents).toHaveLength(1);
    expect(persistedEvent).toBeDefined();

    if (!persistedEvent) {
      throw new Error("Expected persisted Event.");
    }

    expect(persistedEvent.id).toBe(responseBody.id);
    expect(persistedEvent.name).toBe("Christmas 2026");
    expect(persistedEvent.createdAt).toBeInstanceOf(Date);
    expect(persistedEvent.updatedAt).toBeInstanceOf(Date);
  });
});
