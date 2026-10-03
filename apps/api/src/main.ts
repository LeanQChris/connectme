import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger, ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { randomUUID } from "node:crypto";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./presentation/filters/global-exception.filter";

function allowedOrigins(): string[] {
  const configured = (process.env.CORS_ORIGINS || process.env.NEXT_PUBLIC_APP_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV !== "production") {
    configured.push("http://localhost:3000");
  }

  return Array.from(new Set(configured));
}

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

  // Correlation id: honor an inbound x-request-id or mint one, and echo it back.
  app.use((req: any, res: any, next: () => void) => {
    const requestId = (req.headers["x-request-id"] as string) || randomUUID();
    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    next();
  });

  // Trust the configured number of proxy hops so IP-keyed rate limiting sees
  // the real client address behind a load balancer.
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) {
    app.set("trust proxy", /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);
  }

  app.use(helmet());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableShutdownHooks();

  const origins = allowedOrigins();
  app.enableCors({
    origin: origins.length ? origins : false,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = process.env.API_PORT || process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`🚀 ConnectMe NestJS API is listening on port ${port}`);
}

bootstrap();
