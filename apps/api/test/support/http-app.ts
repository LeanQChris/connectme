import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { configureApp } from "../../src/app.setup";

/**
 * Boots a real Nest HTTP app (Express + the production middleware pipeline)
 * for integration tests. Callers supply the module metadata, typically with
 * their infrastructure dependencies overridden via `useValue`.
 */
export async function createHttpTestApp(
  metadata: Parameters<typeof Test.createTestingModule>[0],
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule(metadata).compile();
  const app = moduleRef.createNestApplication({ rawBody: true });
  configureApp(app);
  await app.init();
  return app;
}
