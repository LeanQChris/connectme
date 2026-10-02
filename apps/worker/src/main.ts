import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { WorkerModule } from "./worker.module";

async function bootstrap() {
  const logger = new Logger("WorkerBootstrap");
  const app = await NestFactory.createApplicationContext(WorkerModule);
  await app.init();
  logger.log("⚙️  ConnectMe BullMQ Background Worker is running...");
}

bootstrap();
