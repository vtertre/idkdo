import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

import { config as loadDotenv } from "dotenv";
import { defineConfig } from "drizzle-kit";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const rootEnvPath = resolve(rootDir, ".env");

if (!process.env["DATABASE_URL"] && existsSync(rootEnvPath)) {
  loadDotenv({ path: rootEnvPath, quiet: true });
}

if (!process.env["DATABASE_URL"]) {
  throw new Error("DATABASE_URL is required for Drizzle commands.");
}

const databaseUrl = process.env["DATABASE_URL"];

validateDatabaseUrl(databaseUrl);

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./migrations",
  dbCredentials: {
    url: databaseUrl,
  },
  strict: true,
  verbose: true,
});

function validateDatabaseUrl(value: string): void {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("DATABASE_URL must be a valid URL for Drizzle commands.");
  }

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use postgres:// or postgresql:// for Drizzle commands.");
  }
}
