import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { schema } from "./schema.js";

export type DatabaseClientOptions = {
  databaseUrl?: string;
  maxConnections?: number;
};

export function getDatabaseUrl(databaseUrl = process.env["DATABASE_URL"]): string {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  return databaseUrl;
}

export function createDatabaseClient(options: DatabaseClientOptions = {}) {
  const sqlOptions = options.maxConnections === undefined ? {} : { max: options.maxConnections };
  const sql = postgres(getDatabaseUrl(options.databaseUrl), sqlOptions);
  const db = drizzle(sql, { schema });

  return {
    db,
    sql,
    close: () => sql.end(),
  };
}

export type DatabaseClient = ReturnType<typeof createDatabaseClient>;
export type Database = DatabaseClient["db"];
