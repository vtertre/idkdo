import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

import { config as loadDotenv } from "dotenv";
import { z } from "zod";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const rootEnvPath = resolve(rootDir, ".env");

const environmentSchema = z.object({
  DATABASE_URL: z.string("DATABASE_URL is required.").superRefine(validateDatabaseUrl),
  HOST: z.string().trim().min(1).default("0.0.0.0"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
});

export type ServerEnvironment = {
  databaseUrl: string;
  host: string;
  logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
  nodeEnv: "development" | "test" | "production";
  port: number;
};

export function loadEnvironment(
  source: Record<string, string | undefined> = process.env,
): ServerEnvironment {
  if (source === process.env) {
    loadRootEnvironmentFile();
  }

  const result = environmentSchema.safeParse(source);

  if (!result.success) {
    throw new Error(`Invalid server environment: ${formatEnvironmentError(result.error)}`);
  }

  return {
    databaseUrl: result.data.DATABASE_URL,
    host: result.data.HOST,
    logLevel: result.data.LOG_LEVEL,
    nodeEnv: result.data.NODE_ENV,
    port: result.data.PORT,
  };
}

function loadRootEnvironmentFile(): void {
  if (existsSync(rootEnvPath)) {
    loadDotenv({ path: rootEnvPath, quiet: true });
  }
}

function formatEnvironmentError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".") || "environment";

      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

function validateDatabaseUrl(value: string, context: z.RefinementCtx): void {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    context.addIssue({
      code: "custom",
      message: "DATABASE_URL must be a valid URL.",
    });

    return;
  }

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    context.addIssue({
      code: "custom",
      message: "DATABASE_URL must use postgres:// or postgresql://.",
    });
  }
}
