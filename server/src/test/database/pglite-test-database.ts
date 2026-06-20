import { fileURLToPath } from "node:url";

import { PGlite, type PGliteInterface } from "@electric-sql/pglite";
import { schema, type Database } from "@idkdo/db";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";

type TestDrizzleDatabase = PgliteDatabase<typeof schema> & { $client: PGlite };

export type PgliteTestDatabase = {
  applicationDatabase: Database;
  client: PGliteInterface;
  close(): Promise<void>;
  db: TestDrizzleDatabase;
};

export type PgliteTestDatabaseTemplate = {
  clone(): Promise<PgliteTestDatabase>;
  close(): Promise<void>;
};

export async function createMigratedPgliteTemplate(): Promise<PgliteTestDatabaseTemplate> {
  const templateClient = await PGlite.create();
  const migrations = readMigrationFiles({
    migrationsFolder: fileURLToPath(
      new URL("../../../../packages/db/migrations", import.meta.url),
    ),
  });

  for (const migration of migrations) {
    for (const statement of migration.sql) {
      await templateClient.exec(statement);
    }
  }

  return {
    async clone(): Promise<PgliteTestDatabase> {
      const client = await templateClient.clone();
      const db = drizzle(client as PGlite, { schema });

      return {
        // Keep the current postgres.js-bound application Database type seam
        // contained to one reviewed test helper.
        applicationDatabase: db as unknown as Database,
        client,
        close: async () => {
          await client.close();
        },
        db,
      };
    },
    close: async () => {
      await templateClient.close();
    },
  };
}
