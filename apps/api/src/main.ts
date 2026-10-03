import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  process.on("unhandledRejection", (reason) => {
    logger.error(`Unhandled promise rejection: ${(reason as Error)?.stack || reason}`);
  });
  process.on("uncaughtException", (err) => {
    logger.error(`Uncaught exception: ${err?.stack || err}`);
    process.exit(1);
  });

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  configureApp(app);

  const port = process.env.API_PORT || process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`🚀 ConnectMe NestJS API is listening on port ${port}`);
}

bootstrap();
