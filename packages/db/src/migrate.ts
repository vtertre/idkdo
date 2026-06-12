import { resolve } from "node:path";

import { migrate } from "drizzle-orm/postgres-js/migrator";

import type { Database } from "./client.js";

export type MigrateDatabaseOptions = {
  readonly migrationsFolder?: string;
};

export async function migrateDatabase(
  database: Database,
  options: MigrateDatabaseOptions = {},
): Promise<void> {
  await migrate(database, {
    migrationsFolder:
      options.migrationsFolder ?? resolve(import.meta.dirname, "../migrations"),
  });
}
