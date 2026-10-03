import { INestApplication, ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { randomUUID } from "node:crypto";
import { GlobalExceptionFilter } from "./presentation/filters/global-exception.filter";

function allowedOrigins(): string[] {
  const configured = (process.env.CORS_ORIGINS || process.env.NEXT_PUBLIC_APP_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV !== "production") {
    configured.push("http://localhost:3001");
  }

  return Array.from(new Set(configured));
}

/**
 * Applies the HTTP middleware/pipe/filter pipeline shared by `main.ts` and the
 * HTTP integration tests. Kept separate so tests exercise the real pipeline.
 */
export function configureApp(app: INestApplication): void {
  const expressApp = app as NestExpressApplication;

  // Correlation id: honor an inbound x-request-id or mint one, and echo it back.
  expressApp.use((req: any, res: any, next: () => void) => {
    const requestId = (req.headers["x-request-id"] as string) || randomUUID();
    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    next();
  });

  // Trust the configured number of proxy hops so IP-keyed rate limiting sees
  // the real client address behind a load balancer.
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) {
    expressApp.set("trust proxy", /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);
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
}
