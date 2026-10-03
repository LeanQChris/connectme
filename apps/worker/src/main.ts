import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { WorkerModule } from "./worker.module";

async function bootstrap() {
  const logger = new Logger("WorkerBootstrap");

  // A stray rejection or thrown error must not leave the worker in a zombie
  // state (socket open, job locks held but not processing). Log, then exit and
  // let the process supervisor restart cleanly.
  process.on("unhandledRejection", (reason) => {
    logger.error(`Unhandled promise rejection: ${(reason as Error)?.stack || reason}`);
  });
  process.on("uncaughtException", (err) => {
    logger.error(`Uncaught exception: ${err?.stack || err}`);
    process.exit(1);
  });

  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ["log", "warn", "error"],
  });
  app.enableShutdownHooks();
  await app.init();

  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}, shutting down gracefully...`);
    try {
      await app.close();
    } finally {
      process.exit(0);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  logger.log("⚙️  ConnectMe BullMQ Background Worker is running...");
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Worker bootstrap failed:", err);
  process.exit(1);
});
