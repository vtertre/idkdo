import { buildApp } from "./app.js";
import { loadEnvironment } from "./configuration/environment.js";

const environment = loadEnvironment();
const app = buildApp({ environment });

const shutdownSignals = ["SIGINT", "SIGTERM"] as const;

for (const signal of shutdownSignals) {
  process.once(signal, () => {
    void shutdown(signal);
  });
}

try {
  const address = await app.listen({
    host: environment.host,
    port: environment.port,
  });

  app.log.info({ address }, "server listening");
} catch (error) {
  app.log.error({ err: error }, "server failed to start");
  process.exitCode = 1;
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  app.log.info({ signal }, "server shutting down");

  try {
    await app.close();
  } catch (error) {
    app.log.error({ err: error }, "server shutdown failed");
    process.exitCode = 1;
  }
}
